// This is a pacsal like string implementaion
// The design aims to accelerate wasm delivery and reduce serialization overhead.
// Why not introduce a mature string implementation? Maintaining `link` is too cumbersome,
// and `zig` hasn't reached a stable version 1.0.0.
// Implementing one would actually reduce maintenance costs.
// And this is specifically designed for source map scenarios.

const std = @import("std");
const fs = @import("./fs.zig");

inline fn readU32(data: []const u8, offset: usize) u32 {
    return std.mem.readInt(u32, data[offset..][0..4], .little);
}

inline fn writeU32(buffer: []u8, offset: usize, value: u32) void {
    std.mem.writeInt(u32, buffer[offset..][0..4], value, .little);
}

pub fn Pascal(comptime Structure: type) type {
    const is_map = @hasDecl(Structure, "Entry");
    const has_count = @hasDecl(Structure, "count_prefix") and Structure.count_prefix;

    return struct {
        const Self = @This();

        data: []const u8,

        pub const Iterator = struct {
            data: []const u8,
            offset: usize,
            remaining: if (has_count) usize else void,

            pub fn init(data: []const u8) Iterator {
                if (has_count) {
                    const item_count = if (data.len >= 4) readU32(data, 0) else 0;
                    return .{ .data = data, .offset = 4, .remaining = item_count };
                } else {
                    return .{ .data = data, .offset = 0, .remaining = {} };
                }
            }

            pub fn next(self: *Iterator) ?if (is_map) Structure.Entry else []const u8 {
                if (has_count) {
                    if (self.remaining == 0 or self.offset + 4 > self.data.len) return null;
                    self.remaining -= 1;
                } else {
                    const min_size = if (is_map) 8 else 4;
                    if (self.offset + min_size > self.data.len) return null;
                }

                const first_len = readU32(self.data, self.offset);
                self.offset += 4;

                if (self.offset + first_len > self.data.len) return null;
                const first = self.data[self.offset..][0..first_len];
                self.offset += first_len;

                if (is_map) {
                    if (self.offset + 4 > self.data.len) return null;
                    const second_len = readU32(self.data, self.offset);
                    self.offset += 4;

                    if (self.offset + second_len > self.data.len) return null;
                    const second = self.data[self.offset..][0..second_len];
                    self.offset += second_len;

                    return Structure.Entry{ .key = first, .value = second };
                } else {
                    return first;
                }
            }

            pub fn reset(self: *Iterator) void {
                if (has_count) {
                    self.offset = 4;
                    self.remaining = if (self.data.len >= 4) readU32(self.data, 0) else 0;
                } else {
                    self.offset = 0;
                }
            }
        };

        pub fn decode(data: []const u8) Self {
            return .{ .data = data };
        }

        pub fn iterator(self: *const Self) Iterator {
            return Iterator.init(self.data);
        }

        pub fn get(self: *const Self, arg: if (is_map) []const u8 else usize) ?[]const u8 {
            if (is_map) {
                var iter = self.iterator();
                while (iter.next()) |entry| {
                    if (std.mem.eql(u8, entry.key, arg)) {
                        return entry.value;
                    }
                }
                return null;
            } else {
                var iter = self.iterator();
                var current_index: usize = 0;

                while (iter.next()) |item| {
                    if (current_index == arg) return item;
                    current_index += 1;
                }

                return null;
            }
        }

        pub fn has(self: *const Self, key: []const u8) bool {
            if (!is_map) @compileError("has() is only available for map types");
            return self.get(key) != null;
        }

        pub fn len(self: *const Self) usize {
            if (is_map) @compileError("len() is only available for array types");
            if (!has_count or self.data.len < 4) return 0;
            return readU32(self.data, 0);
        }

        pub fn count(self: *const Self) usize {
            if (!is_map and has_count) {
                return self.len();
            }

            var result: usize = 0;
            var iter = self.iterator();
            while (iter.next()) |_| {
                result += 1;
            }
            return result;
        }
    };
}

pub const StringStructure = struct {
    pub const Entry = struct {
        key: []const u8,
        value: []const u8,
    };
    pub const count_prefix = false;
};

pub const ArrayStructure = struct {
    pub const count_prefix = true;
};

pub const PascalString = Pascal(StringStructure);
pub const PascalArray = Pascal(ArrayStructure);

pub fn PascalEncoder(comptime Structure: type) type {
    const is_map = @hasDecl(Structure, "Entry");
    const has_count = @hasDecl(Structure, "count_prefix") and Structure.count_prefix;

    return struct {
        const Self = @This();

        buffer: std.ArrayList(u8),
        allocator: std.mem.Allocator,
        count: if (has_count) u32 else void,

        pub fn init(allocator: std.mem.Allocator) !Self {
            var buffer = try std.ArrayList(u8).initCapacity(allocator, 1024);

            if (has_count) {
                try buffer.appendNTimes(allocator, 0, 4);
            }

            return .{
                .buffer = buffer,
                .allocator = allocator,
                .count = if (has_count) 0 else {},
            };
        }

        pub fn deinit(self: *Self) void {
            self.buffer.deinit(self.allocator);
        }

        inline fn appendLengthPrefixed(self: *Self, data: []const u8) !void {
            if (data.len > std.math.maxInt(u32)) {
                return error.DataTooLong;
            }

            try self.buffer.appendSlice(self.allocator, &std.mem.toBytes(@as(u32, @intCast(data.len))));
            try self.buffer.appendSlice(self.allocator, data);
        }

        pub fn put(self: *Self, key: []const u8, value: []const u8) !void {
            if (!is_map) @compileError("put() is only available for map types");
            try self.appendLengthPrefixed(key);
            try self.appendLengthPrefixed(value);
        }

        pub fn push(self: *Self, item: []const u8) !void {
            if (is_map) @compileError("push() is only available for array types");
            if (self.count == std.math.maxInt(u32)) return error.TooManyItems;

            try self.appendLengthPrefixed(item);
            self.count += 1;
        }

        pub fn toOwnedSlice(self: *Self) ![]u8 {
            if (has_count) {
                writeU32(self.buffer.items[0..4], 0, self.count);
            }
            return self.buffer.toOwnedSlice(self.allocator);
        }
    };
}

pub const Encoder = PascalEncoder(StringStructure);
pub const ArrayEncoder = PascalEncoder(ArrayStructure);

test "pascal string" {
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

    const obj = PascalString.decode(value);

    try std.testing.expect(obj.has("version"));
    try std.testing.expectEqualStrings("3", obj.get("version").?);
    try std.testing.expect(obj.has("file"));
    try std.testing.expectEqualStrings("index-BixsrqKx.js", obj.get("file").?);
    try std.testing.expect(obj.has("sourcesContent"));
    try std.testing.expect(obj.has("mappings"));

    const pascal_array = PascalArray.decode(obj.get("sourcesContent").?);
    try std.testing.expectStringEndsWith("const o=()=>{};export{o as noop};", pascal_array.get(7).?);
}

test "pascal array" {
    const allocator = std.testing.allocator;

    var encoder = try ArrayEncoder.init(allocator);
    defer encoder.deinit();

    try encoder.push("first");
    try encoder.push("second");
    try encoder.push("third");

    const data = try encoder.toOwnedSlice();
    defer allocator.free(data);

    const array = PascalArray.decode(data);

    try std.testing.expectEqual(@as(usize, 3), array.len());
    try std.testing.expectEqual(@as(usize, 3), array.count());
    try std.testing.expectEqualStrings("first", array.get(0).?);
    try std.testing.expectEqualStrings("second", array.get(1).?);
    try std.testing.expectEqualStrings("third", array.get(2).?);
    try std.testing.expectEqual(@as(?[]const u8, null), array.get(3));
}

test "pascal string encoder" {
    const allocator = std.testing.allocator;

    var encoder = try Encoder.init(allocator);
    defer encoder.deinit();

    try encoder.put("name", "john");
    try encoder.put("age", "30");

    const data = try encoder.toOwnedSlice();
    defer allocator.free(data);

    const string = PascalString.decode(data);

    try std.testing.expectEqualStrings("john", string.get("name").?);
    try std.testing.expectEqualStrings("30", string.get("age").?);
    try std.testing.expectEqual(@as(?[]const u8, null), string.get("unknown"));
    try std.testing.expectEqual(@as(usize, 2), string.count());
}

test "generic iteration" {
    const allocator = std.testing.allocator;

    // Test string iteration
    {
        var encoder = try Encoder.init(allocator);
        defer encoder.deinit();

        try encoder.put("a", "1");
        try encoder.put("b", "2");

        const data = try encoder.toOwnedSlice();
        defer allocator.free(data);

        const string = PascalString.decode(data);
        var iter = string.iterator();

        const first = iter.next().?;
        try std.testing.expectEqualStrings("a", first.key);
        try std.testing.expectEqualStrings("1", first.value);

        const second = iter.next().?;
        try std.testing.expectEqualStrings("b", second.key);
        try std.testing.expectEqualStrings("2", second.value);

        try std.testing.expectEqual(@as(@TypeOf(iter.next()), null), iter.next());
    }

    // Test array iteration
    {
        var encoder = try ArrayEncoder.init(allocator);
        defer encoder.deinit();

        try encoder.push("x");
        try encoder.push("y");

        const data = try encoder.toOwnedSlice();
        defer allocator.free(data);

        const array = PascalArray.decode(data);
        var iter = array.iterator();

        try std.testing.expectEqualStrings("x", iter.next().?);
        try std.testing.expectEqualStrings("y", iter.next().?);
        try std.testing.expectEqual(@as(?[]const u8, null), iter.next());
    }
}
