// https://tc39.es/ecma426/#sec-source-map-format
// Note: This implementation is quite different from traditional source map parsers.
// The purpose of this is to solve the memory overflow implementation in the JavaScript side.
const std = @import("std");
const fs = @import("./fs.zig");

pub const Span = struct {
    start: u32,
    len: u32,
};

pub const Mappings = struct {
    generated_line: u32,
    generated_column: u32,
    source_index: ?u32 = null,
    source_line: ?u32 = null,
    source_column: ?u32 = null,
    name_index: ?u32 = null,
};

pub const SourceMap = struct {
    const Self = @This();

    raw: []const u8,

    version: u8,
    file_span: ?Span,
    source_root_span: ?Span,
    sources_spans: std.ArrayList(Span),
    sources_content_spans: std.ArrayList(?Span),
    names_spans: std.ArrayList(Span),
    mappings_span: Span,

    pub fn init(allocator: std.mem.Allocator, input: []const u8) !Self {
        _ = input; // autofix
        _ = allocator; // autofix
    }

    pub fn deinit(self: *Self) void {
        _ = self; // autofix
    }
};

test "sourcemap decoder" {
    const allocator = std.testing.allocator;

    const default_Wd = try fs.get_default_wd(allocator);

    defer allocator.free(default_Wd);

    const source_map_file = try fs.read_file(allocator, &.{
        default_Wd,
        "/__tests__/fixtures/source-map/index.json",
    });
    defer allocator.free(source_map_file);

    const value = try fs.encode_source_map_as_pascal_string(allocator, source_map_file);

    defer allocator.free(value);

    // std.debug.print("{any}\n", .{value});
    // std.debug.print("source map size: {d}\n", .{value});
}
