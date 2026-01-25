// This is a pacsal like string implementaion
// The design aims to accelerate wasm delivery and reduce serialization overhead.
// Why not introduce a mature string implementation? Maintaining `link` is too cumbersome,
// and `zig` hasn't reached a stable version 1.0.0.
// Implementing one would actually reduce maintenance costs.
// And this is specifically designed for source map scenarios.
const std = @import("std");

//  [[key_len: u32][key][val_len: u32][val]]
pub const PascalString = struct {
    const Self = @This();

    data: []const u8,

    pub fn decode(data: []const u8) Self {
        return .{ .data = data };
    }

    pub fn get(self: *const Self, key: []const u8) ?[]const u8 {
        var offset: usize = 0;

        while (offset + 8 <= self.data.len) {
            const key_len = std.mem.readInt(u32, self.data[offset..][0..4], .little);
            offset += 4;

            if (offset + key_len + 4 > self.data.len) break;

            const current_key = self.data[offset..][0..key_len];
            offset += key_len;

            const val_len = std.mem.readInt(u32, self.data[offset..][0..4], .little);
            offset += 4;

            if (offset + val_len > self.data.len) break;

            if (std.mem.eql(u8, current_key, key)) {
                return self.data[offset..][0..val_len];
            }

            offset += val_len;
        }

        return null;
    }

    pub fn has(self: *const Self, key: []const u8) bool {
        return self.get(key) != null;
    }

    pub fn count(self: *const Self) usize {
        var result: usize = 0;
        var iter = self.iterator();
        while (iter.next()) |_| {
            result += 1;
        }
        return result;
    }

    pub fn iterator(self: *const Self) Iterator {
        return .{ .data = self.data, .offset = 0 };
    }

    pub const Iterator = struct {
        data: []const u8,
        offset: usize,

        pub const Entry = struct {
            key: []const u8,
            value: []const u8,
        };

        pub fn next(self: *Iterator) ?Entry {
            if (self.offset + 8 > self.data.len) return null;

            const key_len = std.mem.readInt(u32, self.data[self.offset..][0..4], .little);
            self.offset += 4;

            if (self.offset + key_len + 4 > self.data.len) return null;
            const key = self.data[self.offset..][0..key_len];
            self.offset += key_len;

            const val_len = std.mem.readInt(u32, self.data[self.offset..][0..4], .little);
            self.offset += 4;

            if (self.offset + val_len > self.data.len) return null;
            const value = self.data[self.offset..][0..val_len];
            self.offset += val_len;

            return .{ .key = key, .value = value };
        }

        pub fn reset(self: *Iterator) void {
            self.offset = 0;
        }
    };
};

pub const Encoder = struct {
    const Self = @This();
    buffer: std.ArrayList(u8),
    allocator: std.mem.Allocator,

    pub fn init(allocator: std.mem.Allocator) !Self {
        return .{
            .buffer = try std.ArrayList(u8).initCapacity(allocator, 1024),
            .allocator = allocator,
        };
    }

    pub fn deinit(self: *Self) void {
        self.buffer.deinit(self.allocator);
    }

    pub fn put(self: *Encoder, key: []const u8, value: []const u8) !void {
        if (key.len > std.math.maxInt(u32)) return error.KeyTooLong;
        if (value.len > std.math.maxInt(u32)) return error.ValueTooLong;

        try self.buffer.appendSlice(self.allocator, &std.mem.toBytes(@as(u32, @intCast(key.len))));
        try self.buffer.appendSlice(self.allocator, key);

        try self.buffer.appendSlice(self.allocator, &std.mem.toBytes(@as(u32, @intCast(value.len))));
        try self.buffer.appendSlice(self.allocator, value);
    }

    pub fn toOwnedSlice(self: *Self) ![]u8 {
        return self.buffer.toOwnedSlice(self.allocator);
    }
};

test "empty object" {
    const allocator = std.testing.allocator;

    var encoder = try Encoder.init(allocator);
    defer encoder.deinit();

    const data = try encoder.toOwnedSlice();
    defer allocator.free(data);

    const obj = PascalString.decode(data);

    try std.testing.expect(obj.get("anything") == null);
    try std.testing.expectEqual(@as(usize, 0), obj.count());
}

test "single entry" {
    const allocator = std.testing.allocator;

    var encoder = try Encoder.init(allocator);
    defer encoder.deinit();

    try encoder.put("key", "value");

    const data = try encoder.toOwnedSlice();
    defer allocator.free(data);

    const obj = PascalString.decode(data);

    try std.testing.expectEqualStrings("value", obj.get("key").?);
    try std.testing.expectEqual(@as(usize, 1), obj.count());
}
