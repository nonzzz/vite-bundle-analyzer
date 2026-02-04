const std = @import("std");

fn base64_decode(ch: u8) ?i32 {
    return switch (ch) {
        'A'...'Z' => @as(i32, ch - 'A'),
        'a'...'z' => @as(i32, ch - 'a' + 26),
        '0'...'9' => @as(i32, ch - '0' + 52),
        '+' => 62,
        '/' => 63,
        else => null,
    };
}

fn decode_vlq(mappings: []const u8, pos: *usize) ?i32 {
    if (pos.* >= mappings.len) return null;

    var result: i32 = 0;
    var shift: u5 = 0;
    var continuation = true;

    while (continuation and pos.* < mappings.len) {
        const digit = base64_decode(mappings[pos.*]) orelse return null;
        pos.* += 1;

        continuation = (digit & 32) != 0;
        const value = digit & 31;

        result += value << shift;
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

        while (pos < mappings_str.len) {
            const ch = mappings_str[pos];

            if (ch == ';') {
                generated_line += 1;
                generated_column = 0;
                pos += 1;
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
        }

        const mappings_owned = try mappings_list.toOwnedSlice(allocator);

        return .{
            .mappings = mappings_owned,
            .allocator = allocator,
        };
    }

    pub fn deinit(self: *Self) void {
        self.allocator.free(self.mappings);
    }

    pub const LookupCache = struct {
        last_index: usize = 0,
        last_line: u32 = 0,
        last_column: u32 = 0,
        last_result: ?OriginalPosition = null,
    };

    pub fn original_position_for_cached(
        self: *const Self,
        line: u32,
        column: u32,
        cache: *LookupCache,
    ) ?OriginalPosition {
        if (self.mappings.len == 0) return null;

        const search_line = if (line > 0) line - 1 else 0;

        if (cache.last_line == search_line and cache.last_column == column) {
            return cache.last_result;
        }

        var start_idx = cache.last_index;

        if (search_line < cache.last_line) {
            start_idx = 0;
        }

        var best_idx: ?usize = null;

        var i = start_idx;
        while (i < self.mappings.len) : (i += 1) {
            const mapping = self.mappings[i];

            if (mapping.generated_line > search_line) break;

            if (mapping.generated_line == search_line) {
                if (mapping.generated_column <= column) {
                    best_idx = i;
                } else {
                    break;
                }
            } else if (mapping.generated_line < search_line) {
                best_idx = i;
            }
        }

        cache.last_line = search_line;
        cache.last_column = column;

        if (best_idx) |idx| {
            const mapping = self.mappings[idx];
            cache.last_index = idx;
            cache.last_result = OriginalPosition{
                .source_index = mapping.source_index,
                .line = mapping.original_line,
                .column = mapping.original_column,
            };
            return cache.last_result;
        }

        cache.last_result = null;
        return null;
    }
};
