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

inline fn update_pos(ch: u8, line: *u32, column: *u32) void {
    if (ch == '\n') {
        line.* += 1;
        column.* = 0;
    } else {
        column.* += 1;
    }
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
    var decoder = SourceMapDecoder.init(allocator, mappings_data, estimated_capacity) catch return null;
    defer decoder.deinit();

    const avg_size_per_source = if (estimated_capacity > 0)
        code.len / estimated_capacity
    else
        1024;

    var grouped = std.StringArrayHashMap(std.ArrayList(u8)).init(allocator);
    defer {
        for (grouped.values()) |*list| {
            list.deinit(allocator);
        }
        grouped.deinit();
    }

    var files = std.ArrayList([]const u8).initCapacity(allocator, estimated_capacity) catch return null;
    defer {
        for (files.items) |file| {
            allocator.free(file);
        }
        files.deinit(allocator);
    }

    if (decoder.mappings.len == 0) {
        var json_buf = std.ArrayList(u8).initCapacity(allocator, 4) catch return null;
        defer json_buf.deinit(allocator);
        const writer = json_buf.writer(allocator);
        writer.writeAll("{\"grouped\":{},\"files\":[]}") catch return null;
        const result_data = json_buf.toOwnedSlice(allocator) catch return null;
        result_len.* = result_data.len;
        return result_data.ptr;
    }

    var cache = SourceMapDecoder.LookupCache{};

    var line: u32 = 1;
    var column: u32 = 0;

    for (code) |ch| {
        const pos = decoder.original_position_for_cached(line, column, &cache);

        if (pos) |p| {
            const source_name = sources.get(p.source_index) orelse {
                update_pos(ch, &line, &column);
                continue;
            };

            const gop = grouped.getOrPut(source_name) catch {
                update_pos(ch, &line, &column);
                continue;
            };

            if (!gop.found_existing) {
                gop.value_ptr.* = std.ArrayList(u8).initCapacity(
                    allocator,
                    avg_size_per_source,
                ) catch {
                    update_pos(ch, &line, &column);
                    continue;
                };

                const key_copy = allocator.dupe(u8, source_name) catch {
                    gop.value_ptr.deinit(allocator);
                    update_pos(ch, &line, &column);
                    continue;
                };
                gop.key_ptr.* = key_copy;

                files.append(allocator, key_copy) catch {};
            }

            gop.value_ptr.append(allocator, ch) catch {};
        }

        update_pos(ch, &line, &column);
    }

    var json_buf = std.ArrayList(u8).initCapacity(allocator, code.len) catch return null;
    defer json_buf.deinit(allocator);

    const writer = json_buf.writer(allocator);
    writer.writeAll("{\"grouped\":{") catch return null;

    var first = true;
    for (grouped.keys(), grouped.values()) |key, value| {
        if (!first) writer.writeByte(',') catch return null;
        first = false;

        write_json_string(writer, key) catch return null;
        writer.writeAll(":{\"code\":") catch return null;
        write_json_string(writer, value.items) catch return null;
        writer.writeByte('}') catch return null;

        allocator.free(key);
    }

    writer.writeAll("},\"files\":[") catch return null;

    first = true;
    for (files.items) |file| {
        if (!first) writer.writeByte(',') catch return null;
        first = false;

        write_json_string(writer, file) catch return null;
    }

    writer.writeAll("]}") catch return null;

    const result_data = json_buf.toOwnedSlice(allocator) catch return null;
    result_len.* = result_data.len;
    return result_data.ptr;
}
