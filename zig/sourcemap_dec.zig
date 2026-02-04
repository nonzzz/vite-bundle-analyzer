const std = @import("std");

inline fn base64_decode(ch: u8) i32 {
    return switch (ch) {
        'A'...'Z' => @as(i32, ch - 'A'),
        'a'...'z' => @as(i32, ch - 'a' + 26),
        '0'...'9' => @as(i32, ch - '0' + 52),
        '+' => 62,
        '/' => 63,
        else => -1,
    };
}

inline fn decode_vlq(mappings: []const u8, pos: *usize) ?i32 {
    if (pos.* >= mappings.len) return null;

    var result: i32 = 0;
    var shift: u5 = 0;

    while (pos.* < mappings.len) {
        const digit = base64_decode(mappings[pos.*]);
        if (digit < 0) return null;

        pos.* += 1;

        const continuation = (digit & 32) != 0;
        const value = digit & 31;

        result += value << shift;

        if (!continuation) break;
        shift += 5;
    }

    const is_negative = (result & 1) == 1;
    result >>= 1;

    return if (is_negative) -result else result;
}

pub const Mapping = struct {
    generated_line: u32,
    generated_column: u32,
    source_index: u32,
    original_line: u32,
    original_column: u32,
};

pub const OriginalPosition = struct {
    source_index: u32,
    line: u32,
    column: u32,
};

pub const SourceMapDecoder = struct {
    mappings: []const Mapping,
    allocator: std.mem.Allocator,
    line_starts: []usize,

    const Self = @This();

    pub fn init(allocator: std.mem.Allocator, mappings_str: []const u8, estimated_capacity: usize) !Self {
        var mappings_list = try std.ArrayList(Mapping).initCapacity(
            allocator,
            estimated_capacity,
        );
        errdefer mappings_list.deinit(allocator);

        var generated_line: u32 = 0;
        var generated_column: i32 = 0;
        var source_index: i32 = 0;
        var original_line: i32 = 0;
        var original_column: i32 = 0;

        var pos: usize = 0;
        var max_line: u32 = 0;

        while (pos < mappings_str.len) {
            const ch = mappings_str[pos];

            if (ch == ';') {
                generated_line += 1;
                generated_column = 0;
                pos += 1;
                if (generated_line > max_line) max_line = generated_line;
                continue;
            }

            if (ch == ',') {
                pos += 1;
                continue;
            }

            const gen_col_delta = decode_vlq(mappings_str, &pos) orelse break;
            generated_column += gen_col_delta;

            if (generated_column < 0) break;

            if (pos >= mappings_str.len or mappings_str[pos] == ',' or mappings_str[pos] == ';') {
                continue;
            }

            const source_delta = decode_vlq(mappings_str, &pos) orelse break;
            source_index += source_delta;

            if (source_index < 0) break;

            const orig_line_delta = decode_vlq(mappings_str, &pos) orelse break;
            original_line += orig_line_delta;

            if (original_line < 0) break;

            const orig_col_delta = decode_vlq(mappings_str, &pos) orelse break;
            original_column += orig_col_delta;

            if (original_column < 0) break;

            if (pos < mappings_str.len and mappings_str[pos] != ',' and mappings_str[pos] != ';') {
                _ = decode_vlq(mappings_str, &pos);
            }

            try mappings_list.append(allocator, .{
                .generated_line = generated_line,
                .generated_column = @intCast(generated_column),
                .source_index = @intCast(source_index),
                .original_line = @intCast(original_line),
                .original_column = @intCast(original_column),
            });

            if (generated_line > max_line) max_line = generated_line;
        }

        const mappings_owned = try mappings_list.toOwnedSlice(allocator);

        var line_starts = try std.ArrayList(usize).initCapacity(allocator, max_line + 2);
        errdefer line_starts.deinit(allocator);

        var current_line: u32 = 0;
        line_starts.append(allocator, 0) catch {};

        for (mappings_owned, 0..) |mapping, i| {
            while (current_line < mapping.generated_line) {
                current_line += 1;
                line_starts.append(allocator, i) catch {};
            }
        }

        while (current_line <= max_line) {
            current_line += 1;
            line_starts.append(allocator, mappings_owned.len) catch {};
        }

        const line_starts_owned = try line_starts.toOwnedSlice(allocator);

        return .{
            .mappings = mappings_owned,
            .allocator = allocator,
            .line_starts = line_starts_owned,
        };
    }

    pub fn deinit(self: *Self) void {
        self.allocator.free(self.mappings);
        self.allocator.free(self.line_starts);
    }

    pub const LookupCache = struct {
        last_index: usize = 0,
        last_line: u32 = 0,
        last_column: u32 = 0,
        last_result: ?OriginalPosition = null,
    };

    pub inline fn original_position_for_cached(
        self: *const Self,
        line: u32,
        column: u32,
        cache: *LookupCache,
    ) ?OriginalPosition {
        if (self.mappings.len == 0) return null;

        if (cache.last_line == line and cache.last_result != null) {
            const cached_mapping = self.mappings[cache.last_index];

            const next_idx = cache.last_index + 1;
            if (next_idx < self.mappings.len) {
                const next_mapping = self.mappings[next_idx];
                if (next_mapping.generated_line == line and next_mapping.generated_column <= column) {
                    cache.last_index = next_idx;
                    cache.last_column = column;
                    const result = OriginalPosition{
                        .source_index = next_mapping.source_index,
                        .line = next_mapping.original_line,
                        .column = next_mapping.original_column,
                    };
                    cache.last_result = result;
                    return result;
                }
            }

            if (cached_mapping.generated_line == line and cached_mapping.generated_column <= column) {
                cache.last_column = column;
                return cache.last_result;
            }
        }

        const start_idx = if (line < self.line_starts.len)
            self.line_starts[line]
        else
            self.mappings.len;

        if (start_idx >= self.mappings.len) {
            cache.last_line = line;
            cache.last_column = column;
            cache.last_result = null;
            cache.last_index = 0;
            return null;
        }

        var best_idx: ?usize = null;
        var i = start_idx;

        while (i < self.mappings.len) : (i += 1) {
            const mapping = self.mappings[i];

            if (mapping.generated_line > line) break;

            if (mapping.generated_line == line and mapping.generated_column <= column) {
                best_idx = i;
            }
        }

        cache.last_line = line;
        cache.last_column = column;

        if (best_idx) |idx| {
            cache.last_index = idx;
            const mapping = self.mappings[idx];
            const result = OriginalPosition{
                .source_index = mapping.source_index,
                .line = mapping.original_line,
                .column = mapping.original_column,
            };
            cache.last_result = result;
            return result;
        }

        cache.last_result = null;
        cache.last_index = 0;
        return null;
    }
};

test "sourcemap decoder basic" {
    const allocator = std.testing.allocator;

    const mappings = "AAAA";
    var decoder = try SourceMapDecoder.init(allocator, mappings, 10);
    defer decoder.deinit();

    try std.testing.expectEqual(@as(usize, 1), decoder.mappings.len);

    const mapping = decoder.mappings[0];
    try std.testing.expectEqual(@as(u32, 0), mapping.generated_line);
    try std.testing.expectEqual(@as(u32, 0), mapping.generated_column);
    try std.testing.expectEqual(@as(u32, 0), mapping.source_index);
    try std.testing.expectEqual(@as(u32, 0), mapping.original_line);
    try std.testing.expectEqual(@as(u32, 0), mapping.original_column);
}

test "full code mapping" {
    const allocator = std.testing.allocator;

    const code = "const normal = 'vite-bundle-analyzer'";
    const mappings = "AAAA";

    var decoder = try SourceMapDecoder.init(allocator, mappings, 10);
    defer decoder.deinit();

    var cache = SourceMapDecoder.LookupCache{};
    var line: u32 = 0;
    var column: u32 = 0;

    var mapped_count: usize = 0;

    for (code) |ch| {
        const pos = decoder.original_position_for_cached(line, column, &cache);

        if (pos != null) {
            mapped_count += 1;
        }

        if (ch == '\n') {
            line += 1;
            column = 0;
        } else {
            column += 1;
        }
    }

    try std.testing.expectEqual(code.len, mapped_count);
}
