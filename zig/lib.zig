const std = @import("std");
const kw_mod = @import("./kw.zig");
const scan_import = @import("./scan_import.zig");
const sourcemap_decoder = @import("./sourcemap_dec.zig");

var gpa = std.heap.GeneralPurposeAllocator(.{}){};
const allocator = gpa.allocator();

const Scanner = scan_import.Scanner(.large);
const SourceMapDecoder = sourcemap_decoder.SourceMapDecoder;

pub export fn alloc(size: usize) ?[*]u8 {
    const slice = allocator.alloc(u8, size) catch return null;
    return slice.ptr;
}

pub export fn free(ptr: [*]u8, size: usize) void {
    allocator.free(ptr[0..size]);
}

/// Decoded view of the kw-encoded sourcemap passed from JS.
/// All slices are zero-copy views into the original input bytes.
/// The `sources` and `sources_content` slices are heap-allocated arrays
/// of those views and must be freed with `deinit`.
///
/// JS side encodes the sourcemap as a flat sequence of 7 kw values
/// (see `encodeSourceMapV3` in index.ts):
///   int(version), string(file), string(sourceRoot), string(mappings),
///   array(sources), array(sourcesContent), array(names)
const KwSourceMap = struct {
    mappings: []const u8,
    sources: []const []const u8,
    sources_content: []const []const u8,

    pub fn deinit(self: *KwSourceMap, alloc_: std.mem.Allocator) void {
        alloc_.free(self.sources);
        alloc_.free(self.sources_content);
    }
};

fn decode_sourcemap_kw(alloc_: std.mem.Allocator, data: []const u8) !KwSourceMap {
    var reader = kw_mod.Reader.init(data);

    // version, file, sourceRoot – not needed, skip
    try reader.skip_value();
    try reader.skip_value();
    try reader.skip_value();

    const mappings = try reader.read_string_slice();

    const sources_count = try reader.read_array_count();
    const sources = try alloc_.alloc([]const u8, sources_count);
    errdefer alloc_.free(sources);
    for (0..sources_count) |i| {
        sources[i] = try reader.read_string_slice();
    }

    const sc_count = try reader.read_array_count();
    const sources_content = try alloc_.alloc([]const u8, sc_count);
    errdefer alloc_.free(sources_content);
    for (0..sc_count) |i| {
        sources_content[i] = try reader.read_string_slice();
    }

    return KwSourceMap{
        .mappings = mappings,
        .sources = sources,
        .sources_content = sources_content,
    };
}

/// Write the `"static"` and `"dynamic"` key-value pairs of a scan result
/// into an already-opened kw object (caller must have called write_object_start
/// with a count that includes these 2 pairs).
fn write_scanner_imports_kw(scanner: *Scanner, w: *kw_mod.Writer) !void {
    const static_count = scanner.count_by_type(.static_import);
    const dynamic_count = scanner.count_by_type(.dynamic_import);

    try w.write_string("static");
    try w.write_array_start(static_count);
    for (0..scanner.len()) |i| {
        if (scanner.get_type(i).? != .static_import) continue;
        try w.write_string(scanner.get_import(i).?);
    }

    try w.write_string("dynamic");
    try w.write_array_start(dynamic_count);
    for (0..scanner.len()) |i| {
        if (scanner.get_type(i).? != .dynamic_import) continue;
        try w.write_string(scanner.get_import(i).?);
    }
}

/// Build and return an owned kw-encoded `{static:[], dynamic:[]}` object.
fn make_empty_scan_result(alloc_: std.mem.Allocator) ?[]const u8 {
    var w = kw_mod.Writer.init(alloc_, 32) catch return null;
    defer w.deinit();
    w.write_object_start(2) catch return null;
    w.write_string("static") catch return null;
    w.write_array_start(0) catch return null;
    w.write_string("dynamic") catch return null;
    w.write_array_start(0) catch return null;
    return alloc_.dupe(u8, w.get_bytes()) catch null;
}

/// Build and return an owned kw-encoded empty array `[]`.
fn make_empty_array_result(alloc_: std.mem.Allocator) ?[]const u8 {
    var w = kw_mod.Writer.init(alloc_, 8) catch return null;
    defer w.deinit();
    w.write_array_start(0) catch return null;
    return alloc_.dupe(u8, w.get_bytes()) catch null;
}

/// Build and return an owned kw-encoded `{grouped:{}, files:[]}` object.
fn make_empty_mappings_result(alloc_: std.mem.Allocator) ?[]const u8 {
    var w = kw_mod.Writer.init(alloc_, 32) catch return null;
    defer w.deinit();
    w.write_object_start(2) catch return null;
    w.write_string("grouped") catch return null;
    w.write_object_start(0) catch return null;
    w.write_string("files") catch return null;
    w.write_array_start(0) catch return null;
    return alloc_.dupe(u8, w.get_bytes()) catch null;
}

/// Scan imports from a single code string.
/// Input:  raw UTF-8 code bytes
/// Output: kw-encoded object  { static: string[], dynamic: string[] }
pub export fn scan_import_stmts_from_code(
    code_ptr: [*]const u8,
    code_len: usize,
    result_len: *usize,
) ?[*]const u8 {
    const code = code_ptr[0..code_len];

    var scanner = Scanner.init(code);
    scanner.scan() catch {
        const empty = make_empty_scan_result(allocator) orelse return null;
        result_len.* = empty.len;
        return empty.ptr;
    };

    if (scanner.len() == 0) {
        const empty = make_empty_scan_result(allocator) orelse return null;
        result_len.* = empty.len;
        return empty.ptr;
    }

    const static_count = scanner.count_by_type(.static_import);
    const dynamic_count = scanner.count_by_type(.dynamic_import);
    const estimated = 32 + (static_count + dynamic_count) * 32;

    var w = kw_mod.Writer.init(allocator, estimated) catch return null;
    defer w.deinit();

    w.write_object_start(2) catch return null;
    write_scanner_imports_kw(&scanner, &w) catch return null;

    const result_data = allocator.dupe(u8, w.get_bytes()) catch return null;
    result_len.* = result_data.len;
    return result_data.ptr;
}

/// Scan imports from every source in a kw-encoded source map.
/// Input:  kw-encoded source map (see encodeSourceMapV3 in index.ts)
/// Output: kw-encoded array of { index: int, source: string, static: string[], dynamic: string[] }
pub export fn scan_source_map_imports(
    sourcemap_ptr: [*]const u8,
    sourcemap_len: usize,
    result_len: *usize,
) ?[*]const u8 {
    const sourcemap_data = sourcemap_ptr[0..sourcemap_len];

    var sm = decode_sourcemap_kw(allocator, sourcemap_data) catch {
        const empty = make_empty_array_result(allocator) orelse return null;
        result_len.* = empty.len;
        return empty.ptr;
    };
    defer sm.deinit(allocator);

    // First pass: count entries that actually have imports.
    var result_count: usize = 0;
    for (sm.sources_content) |source_code| {
        if (source_code.len == 0) continue;
        var scanner = Scanner.init(source_code);
        scanner.scan() catch continue;
        if (scanner.len() == 0) continue;
        result_count += 1;
    }

    const estimated = 64 + result_count * 128;
    var w = kw_mod.Writer.init(allocator, estimated) catch return null;
    defer w.deinit();

    w.write_array_start(result_count) catch return null;

    // Second pass: write entries.
    for (sm.sources_content, 0..) |source_code, i| {
        if (source_code.len == 0) continue;
        var scanner = Scanner.init(source_code);
        scanner.scan() catch continue;
        if (scanner.len() == 0) continue;

        const source_name = if (i < sm.sources.len) sm.sources[i] else "";

        // { index, source, static, dynamic } = 4 fields
        w.write_object_start(4) catch return null;
        w.write_string("index") catch return null;
        w.write_int(@as(i64, @intCast(i))) catch return null;
        w.write_string("source") catch return null;
        w.write_string(source_name) catch return null;
        write_scanner_imports_kw(&scanner, &w) catch return null;
    }

    const result_data = allocator.dupe(u8, w.get_bytes()) catch return null;
    result_len.* = result_data.len;
    return result_data.ptr;
}

/// Map generated-code positions back to original source files using the source map.
/// Input:  raw UTF-8 generated code, kw-encoded source map
/// Output: kw-encoded object { grouped: { [file]: { code: string } }, files: string[] }
pub export fn pickup_mappings_from_code(
    code_ptr: [*]const u8,
    code_len: usize,
    sourcemap_ptr: [*]const u8,
    sourcemap_len: usize,
    result_len: *usize,
) ?[*]const u8 {
    const code = code_ptr[0..code_len];
    const sourcemap_data = sourcemap_ptr[0..sourcemap_len];

    var sm = decode_sourcemap_kw(allocator, sourcemap_data) catch {
        const empty = make_empty_mappings_result(allocator) orelse return null;
        result_len.* = empty.len;
        return empty.ptr;
    };
    defer sm.deinit(allocator);

    const estimated_capacity = sm.sources.len;

    var decoder = SourceMapDecoder.init(allocator, sm.mappings, estimated_capacity * 100) catch {
        const empty = make_empty_mappings_result(allocator) orelse return null;
        result_len.* = empty.len;
        return empty.ptr;
    };
    defer decoder.deinit();

    if (decoder.mappings.len == 0) {
        const empty = make_empty_mappings_result(allocator) orelse return null;
        result_len.* = empty.len;
        return empty.ptr;
    }

    const avg_size_per_source = if (estimated_capacity > 0) code.len / estimated_capacity else 4096;

    var source_buffers = std.ArrayList(?std.ArrayList(u8)).initCapacity(allocator, estimated_capacity) catch return null;
    defer {
        for (source_buffers.items) |*opt_buf| {
            if (opt_buf.*) |*buf| buf.deinit(allocator);
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

    for (code) |ch| {
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

        if (ch == '\n') {
            line += 1;
            column = 0;
        } else {
            column += 1;
        }
    }

    const hit_count = files_set.count();
    const estimated_out = code.len + estimated_capacity * 128;
    var w = kw_mod.Writer.init(allocator, estimated_out) catch return null;
    defer w.deinit();

    // { grouped: { ... }, files: [...] }
    w.write_object_start(2) catch return null;

    w.write_string("grouped") catch return null;
    w.write_object_start(hit_count) catch return null;

    var file_iter = files_set.keyIterator();
    while (file_iter.next()) |source_idx_ptr| {
        const source_idx = source_idx_ptr.*;
        if (source_idx >= source_buffers.items.len) continue;
        const opt_buf = source_buffers.items[source_idx];
        if (opt_buf == null) continue;
        const source_name = if (source_idx < sm.sources.len) sm.sources[source_idx] else continue;
        const value = opt_buf.?.items;

        // key = source_name, value = { code: "..." }
        w.write_string(source_name) catch return null;
        w.write_object_start(1) catch return null;
        w.write_string("code") catch return null;
        w.write_string(value) catch return null;
    }

    w.write_string("files") catch return null;
    w.write_array_start(hit_count) catch return null;

    file_iter = files_set.keyIterator();
    while (file_iter.next()) |source_idx_ptr| {
        const source_idx = source_idx_ptr.*;
        const source_name = if (source_idx < sm.sources.len) sm.sources[source_idx] else continue;
        w.write_string(source_name) catch return null;
    }

    const result_data = allocator.dupe(u8, w.get_bytes()) catch return null;
    result_len.* = result_data.len;
    return result_data.ptr;
}
