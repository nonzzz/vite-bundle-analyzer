const std = @import("std");
const pascal = @import("./pascal_string.zig");
const scan_import = @import("./scan_import.zig");

var gpa = std.heap.GeneralPurposeAllocator(.{}){};
const allocator = gpa.allocator();

const Scanner = scan_import.Scanner(.large);

pub export fn alloc(size: usize) ?[*]u8 {
    const slice = allocator.alloc(u8, size) catch return null;
    return slice.ptr;
}

pub export fn free(ptr: [*]u8, size: usize) void {
    allocator.free(ptr[0..size]);
}

const BinaryWriter = struct {
    buf: std.ArrayList(u8),

    fn init() !BinaryWriter {
        return .{ .buf = try std.ArrayList(u8).initCapacity(allocator, 1024) };
    }

    fn deinit(self: *BinaryWriter) void {
        self.buf.deinit(allocator);
    }

    fn writeU32(self: *BinaryWriter, value: u32) !void {
        var bytes: [4]u8 = undefined;
        std.mem.writeInt(u32, &bytes, value, .little);
        try self.buf.appendSlice(allocator, &bytes);
    }

    fn writeString(self: *BinaryWriter, str: []const u8) !void {
        try self.writeU32(@intCast(str.len));
        try self.buf.appendSlice(allocator, str);
    }

    fn toOwnedSlice(self: *BinaryWriter) ![]u8 {
        return self.buf.toOwnedSlice(allocator);
    }
};

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
