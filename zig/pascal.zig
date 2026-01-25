// This is a pacsal like string implementaion
// The design aims to accelerate wasm delivery and reduce serialization overhead.
// Why not introduce a mature string implementation? Maintaining `link` is too cumbersome,
// and `zig` hasn't reached a stable version 1.0.0.
// Implementing one would actually reduce maintenance costs.
// And this is specifically designed for source map scenarios.
const std = @import("std");
const fs = @import("./fs.zig");

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

// Format: [count: u32][[len: u32][item]]...
pub const PascalArray = struct {
    const Self = @This();

    data: []const u8,

    pub fn decode(data: []const u8) Self {
        return .{ .data = data };
    }

    pub fn len(self: *const Self) usize {
        if (self.data.len < 4) return 0;
        return std.mem.readInt(u32, self.data[0..4], .little);
    }

    pub fn get(self: *const Self, index: usize) ?[]const u8 {
        if (self.data.len < 4) return null;

        const count = std.mem.readInt(u32, self.data[0..4], .little);
        if (index >= count) return null;

        var offset: usize = 4;
        var current_index: usize = 0;

        while (offset + 4 <= self.data.len) {
            const item_len = std.mem.readInt(u32, self.data[offset..][0..4], .little);
            offset += 4;

            if (offset + item_len > self.data.len) return null;

            if (current_index == index) {
                return self.data[offset..][0..item_len];
            }

            offset += item_len;
            current_index += 1;
        }

        return null;
    }

    pub fn iterator(self: *const Self) Iterator {
        return .{ .data = self.data, .offset = 4, .remaining = self.len() };
    }

    pub const Iterator = struct {
        data: []const u8,
        offset: usize,
        remaining: usize,

        pub fn next(self: *Iterator) ?[]const u8 {
            if (self.remaining == 0 or self.offset + 4 > self.data.len) return null;

            const item_len = std.mem.readInt(u32, self.data[self.offset..][0..4], .little);
            self.offset += 4;

            if (self.offset + item_len > self.data.len) return null;
            const item = self.data[self.offset..][0..item_len];
            self.offset += item_len;
            self.remaining -= 1;

            return item;
        }

        pub fn reset(self: *Iterator) void {
            self.offset = 4;
            self.remaining = if (self.data.len >= 4)
                std.mem.readInt(u32, self.data[0..4], .little)
            else
                0;
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

pub const ArrayEncoder = struct {
    const Self = @This();
    buffer: std.ArrayList(u8),
    allocator: std.mem.Allocator,
    count: u32,

    pub fn init(allocator: std.mem.Allocator) !Self {
        var buffer = try std.ArrayList(u8).initCapacity(allocator, 1024);
        try buffer.appendNTimes(allocator, 0, 4);

        return .{
            .buffer = buffer,
            .allocator = allocator,
            .count = 0,
        };
    }

    pub fn deinit(self: *Self) void {
        self.buffer.deinit(self.allocator);
    }

    pub fn push(self: *Self, item: []const u8) !void {
        if (item.len > std.math.maxInt(u32)) return error.ItemTooLong;
        if (self.count == std.math.maxInt(u32)) return error.TooManyItems;

        try self.buffer.appendSlice(self.allocator, &std.mem.toBytes(@as(u32, @intCast(item.len))));
        try self.buffer.appendSlice(self.allocator, item);
        self.count += 1;
    }

    pub fn toOwnedSlice(self: *Self) ![]u8 {
        std.mem.writeInt(u32, self.buffer.items[0..4], self.count, .little);
        return self.buffer.toOwnedSlice(self.allocator);
    }
};

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

    const obj = PascalString.decode(value);

    defer allocator.free(value);

    try std.testing.expect(obj.has("version"));
    try std.testing.expectEqualStrings("3", obj.get("version").?);
    try std.testing.expect(obj.has("file"));
    try std.testing.expectEqualStrings("index-BixsrqKx.js", obj.get("file").?);
    try std.testing.expect(obj.has("sourcesContent"));
    try std.testing.expect(obj.has("mappings"));
    const pascal_array = PascalArray.decode(obj.get("sourcesContent").?);
    try std.testing.expectStringEndsWith("const o=()=>{};export{o as noop};", pascal_array.get(7).?);
}
