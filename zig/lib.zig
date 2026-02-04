const std = @import("std");
const pascal = @import("./pascal_string.zig");
const scan_import = @import("./scan_import.zig");
const sourcemap_decoder = @import("./sourcemap_dec.zig");

var gpa = std.heap.GeneralPurposeAllocator(.{}){};
const allocator = gpa.allocator();

const Scanner = scan_import.Scanner(.large);
const SourceMapDecoder = sourcemap_decoder.SourceMapDecoder;
const OriginalPosition = sourcemap_decoder.OriginalPosition;

pub export fn alloc(size: usize) ?[*]u8 {
    const slice = allocator.alloc(u8, size) catch return null;
    return slice.ptr;
}

pub export fn free(ptr: [*]u8, size: usize) void {
    allocator.free(ptr[0..size]);
}

fn write_json_string(writer: anytype, str: []const u8) !void {
    try writer.writeByte('"');
    for (str) |ch| {
        switch (ch) {
            '"' => try writer.writeAll("\\\""),
            '\\' => try writer.writeAll("\\\\"),
            '\n' => try writer.writeAll("\\n"),
            '\r' => try writer.writeAll("\\r"),
            '\t' => try writer.writeAll("\\t"),
            else => {
                if (ch < 32) {
                    try writer.print("\\u{x:0>4}", .{ch});
                } else {
                    try writer.writeByte(ch);
                }
            },
        }
    }
    try writer.writeByte('"');
}

/// Scan imports from entire source map
/// Input: Pascal-encoded source map
/// Output: JSON array of results
/// Format: [{"index":0,"source":"src/foo.js","static":["foo"],"dynamic":["bar"]}, ...]
pub export fn scan_source_map_imports(
    sourcemap_pascal_ptr: [*]const u8,
    sourcemap_pascal_len: usize,
    result_len: *usize,
) ?[*]const u8 {
    const sourcemap_data = sourcemap_pascal_ptr[0..sourcemap_pascal_len];
    const sourcemap = pascal.PascalString.decode(sourcemap_data);

    const sources_data = sourcemap.get("sources") orelse {
        const empty = allocator.dupe(u8, "[]") catch return null;
        result_len.* = empty.len;
        return empty.ptr;
    };
    const sources = pascal.PascalArray.decode(sources_data);

    const sources_content_data = sourcemap.get("sourcesContent") orelse {
        const empty = allocator.dupe(u8, "[]") catch return null;
        result_len.* = empty.len;
        return empty.ptr;
    };
    const sources_content = pascal.PascalArray.decode(sources_content_data);

    var json_buf = std.ArrayList(u8).initCapacity(allocator, 1024) catch return null;
    defer json_buf.deinit(allocator);

    const writer = json_buf.writer(allocator);

    writer.writeByte('[') catch return null;

    var source_index: u32 = 0;
    var iter = sources_content.iterator();
    var first = true;

    while (iter.next()) |source_code| : (source_index += 1) {
        var scanner = Scanner.init(source_code);

        scanner.scan() catch {
            continue;
        };

        if (scanner.len() == 0) continue;

        if (!first) {
            writer.writeByte(',') catch return null;
        }
        first = false;

        const source_name = sources.get(source_index) orelse "";

        writer.print("{{\"index\":{d},\"source\":", .{source_index}) catch return null;
        write_json_string(writer, source_name) catch return null;
        writer.writeAll(",\"static\":[") catch return null;

        var static_first = true;
        for (0..scanner.len()) |i| {
            const import_type = scanner.get_type(i).?;
            if (import_type != .static_import) continue;

            if (!static_first) {
                writer.writeByte(',') catch return null;
            }
            static_first = false;

            const import_spec = scanner.get_import(i).?;
            write_json_string(writer, import_spec) catch return null;
        }

        writer.writeAll("],\"dynamic\":[") catch return null;

        var dynamic_first = true;
        for (0..scanner.len()) |i| {
            const import_type = scanner.get_type(i).?;
            if (import_type != .dynamic_import) continue;

            if (!dynamic_first) {
                writer.writeByte(',') catch return null;
            }
            dynamic_first = false;

            const import_spec = scanner.get_import(i).?;
            write_json_string(writer, import_spec) catch return null;
        }

        writer.writeAll("]}") catch return null;
    }

    writer.writeByte(']') catch return null;

    const result_data = json_buf.toOwnedSlice(allocator) catch return null;
    result_len.* = result_data.len;
    return result_data.ptr;
}

pub export fn pickup_mappings_from_code(
    code_ptr: [*]const u8,
    code_len: usize,
    sourcemap_pascal_ptr: [*]const u8,
    sourcemap_pascal_len: usize,
    result_len: *usize,
) ?[*]const u8 {
    const code = code_ptr[0..code_len];
    const sourcemap_data = sourcemap_pascal_ptr[0..sourcemap_pascal_len];
    const sourcemap = pascal.PascalString.decode(sourcemap_data);

    const sources_data = sourcemap.get("sources") orelse {
        const empty = allocator.dupe(u8, "{\"grouped\":{},\"files\":[]}") catch return null;
        result_len.* = empty.len;
        return empty.ptr;
    };
    const sources = pascal.PascalArray.decode(sources_data);

    const mappings_data = sourcemap.get("mappings") orelse {
        const empty = allocator.dupe(u8, "{\"grouped\":{},\"files\":[]}") catch return null;
        result_len.* = empty.len;
        return empty.ptr;
    };

    const estimated_capacity = sources.len();
    var decoder = SourceMapDecoder.init(allocator, mappings_data, estimated_capacity * 100) catch return null;
    defer decoder.deinit();

    if (decoder.mappings.len == 0) {
        const empty = allocator.dupe(u8, "{\"grouped\":{},\"files\":[]}") catch return null;
        result_len.* = empty.len;
        return empty.ptr;
    }

    const avg_size_per_source = if (estimated_capacity > 0)
        code.len / estimated_capacity
    else
        4096;

    var source_buffers = std.ArrayList(?std.ArrayList(u8)).initCapacity(allocator, estimated_capacity) catch return null;
    defer {
        for (source_buffers.items) |*opt_buf| {
            if (opt_buf.*) |*buf| {
                buf.deinit(allocator);
            }
        }
        source_buffers.deinit(allocator);
    }

    var init_idx: usize = 0;
    while (init_idx < estimated_capacity) : (init_idx += 1) {
        source_buffers.append(allocator, null) catch return null;
    }

    var files_set = std.AutoHashMap(u32, void).init(allocator);
    defer files_set.deinit();

    var cache = SourceMapDecoder.LookupCache{};

    var line: u32 = 0;
    var column: u32 = 0;

    var idx: usize = 0;
    while (idx < code.len) : (idx += 1) {
        const ch = code[idx];

        const pos = decoder.original_position_for_cached(line, column, &cache);

        if (pos) |p| {
            const source_idx = p.source_index;

            if (source_idx >= source_buffers.items.len) {
                while (source_buffers.items.len <= source_idx) {
                    source_buffers.append(allocator, null) catch break;
                }
            }

            if (source_idx < source_buffers.items.len) {
                if (source_buffers.items[source_idx] == null) {
                    source_buffers.items[source_idx] = std.ArrayList(u8).initCapacity(
                        allocator,
                        avg_size_per_source,
                    ) catch null;
                    files_set.put(source_idx, {}) catch {};
                }

                if (source_buffers.items[source_idx]) |*buf| {
                    buf.append(allocator, ch) catch {};
                }
            }
        }

        // Update position
        if (ch == '\n') {
            line += 1;
            column = 0;
        } else {
            column += 1;
        }
    }

    const estimated_json_size = code.len + (estimated_capacity * 128);
    var json_buf = std.ArrayList(u8).initCapacity(allocator, estimated_json_size) catch return null;
    defer json_buf.deinit(allocator);

    const writer = json_buf.writer(allocator);
    writer.writeAll("{\"grouped\":{") catch return null;

    var first = true;
    var file_iter = files_set.keyIterator();
    while (file_iter.next()) |source_idx_ptr| {
        const source_idx = source_idx_ptr.*;

        if (source_idx >= source_buffers.items.len) continue;
        const opt_buf = source_buffers.items[source_idx];
        if (opt_buf == null) continue;

        const source_name = sources.get(source_idx) orelse continue;
        const value = opt_buf.?.items;

        if (!first) writer.writeByte(',') catch return null;
        first = false;

        write_json_string(writer, source_name) catch return null;
        writer.writeAll(":{\"code\":") catch return null;
        write_json_string(writer, value) catch return null;
        writer.writeByte('}') catch return null;
    }

    writer.writeAll("},\"files\":[") catch return null;

    first = true;
    file_iter = files_set.keyIterator();
    while (file_iter.next()) |source_idx_ptr| {
        const source_idx = source_idx_ptr.*;
        const source_name = sources.get(source_idx) orelse continue;

        if (!first) writer.writeByte(',') catch return null;
        first = false;

        write_json_string(writer, source_name) catch return null;
    }

    writer.writeAll("]}") catch return null;

    const result_data = json_buf.toOwnedSlice(allocator) catch return null;
    result_len.* = result_data.len;
    return result_data.ptr;
}
