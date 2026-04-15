const std = @import("std");

const Allocator = std.mem.Allocator;
const ArrayList = std.ArrayList;

pub const Tag = enum(u8) {
    null = 0,
    undefined = 1,
    true = 2,
    false = 3,
    int = 4,
    float = 5,
    bytes = 6,
    string = 7,
    array = 8,
    object = 9,
    _,
};

fn zig_zag_encode(n: i64) u64 {
    return @bitCast((n << 1) ^ (n >> 63));
}

fn zig_zag_decode(n: u64) i64 {
    const signed: i64 = @intCast(n >> 1);
    return signed ^ -@as(i64, @intCast(n & 1));
}

fn write_uleb128(value: u64, writer: anytype) !void {
    var val = value;
    while (true) {
        var byte: u8 = @intCast(val & 0x7f);
        val >>= 7;
        if (val != 0) {
            byte |= 0x80;
        }
        try writer.writeByte(byte);
        if (val == 0) break;
    }
}

fn read_uleb128(bytes: []const u8, offset: *usize) !u64 {
    var result: u64 = 0;
    var shift: usize = 0;
    var byte: u8 = undefined;

    while (true) {
        if (offset.* >= bytes.len) return error.UnexpectedEndOfBuffer;

        if (shift >= 64) return error.ULeb128Overflow;

        byte = bytes[offset.*];
        offset.* += 1;

        result |= @as(u64, byte & 0x7f) << @intCast(shift);

        if ((byte & 0x80) == 0) break;
        shift += 7;
    }

    return result;
}

pub const Writer = struct {
    const Self = @This();

    buffer: ArrayList(u8),
    allocator: Allocator,

    pub fn init(allocator: Allocator, init_capacity: usize) !Self {
        var buffer = try ArrayList(u8).initCapacity(allocator, init_capacity);
        errdefer buffer.deinit(allocator);
        return Self{
            .buffer = buffer,
            .allocator = allocator,
        };
    }

    pub fn deinit(self: *Self) void {
        self.buffer.deinit(self.allocator);
    }

    pub fn write_bool(self: *Self, input: bool) !void {
        const tag: u8 = if (input) @intFromEnum(Tag.true) else @intFromEnum(Tag.false);
        try self.buffer.append(self.allocator, tag);
    }

    pub fn write_null(self: *Self) !void {
        try self.buffer.append(self.allocator, @intFromEnum(Tag.null));
    }

    pub fn write_undefined(self: *Self) !void {
        try self.buffer.append(self.allocator, @intFromEnum(Tag.undefined));
    }

    pub fn write_int(self: *Self, input: i64) !void {
        try self.buffer.append(self.allocator, @intFromEnum(Tag.int));

        const zig_zagged = zig_zag_encode(input);
        try write_uleb128(zig_zagged, self.buffer.writer(self.allocator));
    }

    pub fn write_float(self: *Self, input: f64) !void {
        try self.buffer.append(self.allocator, @intFromEnum(Tag.float));

        const bytes_value: [8]u8 = @bitCast(input);
        try self.buffer.appendSlice(self.allocator, &bytes_value);
    }

    fn write_bytes_like(self: *Self, comptime tag: Tag, input: []const u8) !void {
        comptime {
            if (tag != .bytes and tag != .string) {
                @compileError("tag must be .bytes or .string");
            }
        }
        try self.buffer.append(self.allocator, @intFromEnum(tag));

        const zig_zagged = zig_zag_encode(@intCast(input.len));
        try write_uleb128(zig_zagged, self.buffer.writer(self.allocator));
        try self.buffer.appendSlice(self.allocator, input);
    }

    pub fn write_bytes(self: *Self, input: []const u8) !void {
        try self.write_bytes_like(.bytes, input);
    }

    pub fn write_string(self: *Self, input: []const u8) !void {
        try self.write_bytes_like(.string, input);
    }

    /// Write the array tag + element count.  Caller must then write `count` values.
    pub fn write_array_start(self: *Self, count: usize) !void {
        try self.buffer.append(self.allocator, @intFromEnum(Tag.array));
        const zig_zagged = zig_zag_encode(@intCast(count));
        try write_uleb128(zig_zagged, self.buffer.writer(self.allocator));
    }

    /// Write the object tag + field count.  Caller must then write `count` key-value pairs.
    pub fn write_object_start(self: *Self, count: usize) !void {
        try self.buffer.append(self.allocator, @intFromEnum(Tag.object));
        const zig_zagged = zig_zag_encode(@intCast(count));
        try write_uleb128(zig_zagged, self.buffer.writer(self.allocator));
    }

    pub fn get_bytes(self: *const Self) []const u8 {
        return self.buffer.items;
    }
};

pub const Reader = struct {
    const Self = @This();

    bytes: []const u8,
    offset: usize,

    pub fn init(bytes: []const u8) Self {
        return Self{
            .bytes = bytes,
            .offset = 0,
        };
    }

    fn read_uleb128_internal(self: *Self) !u64 {
        return try read_uleb128(self.bytes, &self.offset);
    }

    fn read_length(self: *Self) !i64 {
        const zig_zagged = try self.read_uleb128_internal();
        return zig_zag_decode(zig_zagged);
    }

    /// Skip over one kw value without allocating.
    pub fn skip_value(self: *Self) !void {
        if (self.offset >= self.bytes.len) return error.UnexpectedEndOfBuffer;
        const tag_byte = self.bytes[self.offset];
        self.offset += 1;
        const tag: Tag = @enumFromInt(tag_byte);
        switch (tag) {
            .null, .undefined, .true, .false => {},
            .int => _ = try self.read_uleb128_internal(),
            .float => {
                if (self.offset + 8 > self.bytes.len) return error.UnexpectedEndOfBuffer;
                self.offset += 8;
            },
            .bytes, .string => {
                const length = try self.read_length();
                if (length < 0) return error.InvalidLength;
                const len: usize = @intCast(length);
                if (self.offset + len > self.bytes.len) return error.UnexpectedEndOfBuffer;
                self.offset += len;
            },
            .array => {
                const count = try self.read_length();
                if (count < 0) return error.InvalidLength;
                const n: usize = @intCast(count);
                for (0..n) |_| try self.skip_value();
            },
            .object => {
                const count = try self.read_length();
                if (count < 0) return error.InvalidLength;
                const n: usize = @intCast(count);
                for (0..n) |_| {
                    try self.skip_value();
                    try self.skip_value();
                }
            },
            _ => return error.InvalidTag,
        }
    }

    /// Read a string or bytes value as a zero-copy slice into the source bytes.
    /// null/undefined tags return an empty slice instead of an error.
    pub fn read_string_slice(self: *Self) ![]const u8 {
        if (self.offset >= self.bytes.len) return error.UnexpectedEndOfBuffer;
        const tag_byte = self.bytes[self.offset];
        self.offset += 1;
        const tag: Tag = @enumFromInt(tag_byte);
        switch (tag) {
            .string, .bytes => {
                const length = try self.read_length();
                if (length < 0) return error.InvalidLength;
                const len: usize = @intCast(length);
                if (self.offset + len > self.bytes.len) return error.UnexpectedEndOfBuffer;
                const slice = self.bytes[self.offset..][0..len];
                self.offset += len;
                return slice;
            },
            .null, .undefined => return "",
            else => return error.InvalidTag,
        }
    }

    /// Expect an array tag, read its element count, and position the reader at the
    /// first element.  The caller must then read exactly `count` values.
    pub fn read_array_count(self: *Self) !usize {
        if (self.offset >= self.bytes.len) return error.UnexpectedEndOfBuffer;
        const tag_byte = self.bytes[self.offset];
        self.offset += 1;
        const tag: Tag = @enumFromInt(tag_byte);
        if (tag != .array) return error.InvalidTag;
        const count = try self.read_length();
        if (count < 0) return error.InvalidLength;
        return @intCast(count);
    }

    pub fn decode(self: *Self, allocator: Allocator) !Value {
        if (self.offset >= self.bytes.len) return error.UnexpectedEndOfBuffer;

        const tag_byte = self.bytes[self.offset];
        self.offset += 1;

        const tag: Tag = @enumFromInt(tag_byte);

        switch (tag) {
            .true => return Value{ .bool_value = true },
            .false => return Value{ .bool_value = false },
            .null => return Value.null_value,
            .undefined => return Value.undefined_value,
            .int => {
                const zig_zagged = try self.read_uleb128_internal();
                return Value{ .int = zig_zag_decode(zig_zagged) };
            },
            .float => {
                if (self.offset + 8 > self.bytes.len) return error.UnexpectedEndOfBuffer;
                const bytes_value = self.bytes[self.offset..][0..8];
                const value: f64 = @bitCast(bytes_value.*);
                self.offset += 8;
                return Value{ .float = value };
            },
            .bytes => {
                const length = try self.read_length();
                if (length < 0) return error.InvalidLength;
                const len: usize = @intCast(length);
                if (self.offset + len > self.bytes.len) return error.UnexpectedEndOfBuffer;

                const value = try allocator.dupe(u8, self.bytes[self.offset..][0..len]);
                self.offset += len;
                return Value{ .bytes = value };
            },
            .string => {
                const length = try self.read_length();
                if (length < 0) return error.InvalidLength;
                const len: usize = @intCast(length);
                if (self.offset + len > self.bytes.len) return error.UnexpectedEndOfBuffer;

                const value = try allocator.dupe(u8, self.bytes[self.offset..][0..len]);
                self.offset += len;
                return Value{ .string = value };
            },
            .array => {
                const length = try self.read_length();
                if (length < 0) return error.InvalidLength;
                const len: usize = @intCast(length);

                var arr = try allocator.alloc(Value, len);
                errdefer {
                    for (arr) |*item| item.deinit(allocator);
                    allocator.free(arr);
                }

                for (0..len) |i| {
                    arr[i] = try self.decode(allocator);
                }
                return Value{ .array = arr };
            },
            .object => {
                const length = try self.read_length();
                if (length < 0) return error.InvalidLength;
                const len: usize = @intCast(length);

                var map = std.StringHashMap(Value).init(allocator);
                errdefer {
                    var it = map.iterator();
                    while (it.next()) |entry| {
                        allocator.free(entry.key_ptr.*);
                        entry.value_ptr.deinit(allocator);
                    }
                    map.deinit();
                }

                for (0..len) |_| {
                    var key_value = try self.decode(allocator);
                    const key = switch (key_value) {
                        .string => |s| s,
                        else => {
                            key_value.deinit(allocator);
                            return error.InvalidObjectKey;
                        },
                    };
                    const value = try self.decode(allocator);
                    try map.put(key, value);
                }
                return Value{ .object = map };
            },
            _ => return error.InvalidTag,
        }
    }
};

pub const Value = union(enum) {
    const Self = @This();

    null_value,
    undefined_value,
    bool_value: bool,
    int: i64,
    float: f64,
    bytes: []u8,
    string: []u8,
    array: []Value,
    object: std.StringHashMap(Value),

    pub fn deinit(self: *Self, allocator: Allocator) void {
        switch (self.*) {
            .bytes => |b| allocator.free(b),
            .string => |s| allocator.free(s),
            .array => |arr| {
                for (arr) |*item| item.deinit(allocator);
                allocator.free(arr);
            },
            .object => |*obj| {
                var it = obj.iterator();
                while (it.next()) |entry| {
                    allocator.free(entry.key_ptr.*);
                    entry.value_ptr.deinit(allocator);
                }
                obj.deinit();
            },
            else => {},
        }
    }
};

pub fn encode(allocator: Allocator, data: Value, init_capacity: usize) ![]const u8 {
    var writer = try Writer.init(allocator, init_capacity);
    errdefer writer.deinit();

    try encode_value(&writer, data);

    const result = try allocator.dupe(u8, writer.get_bytes());
    writer.deinit();
    return result;
}

fn encode_value(writer: *Writer, data: Value) !void {
    switch (data) {
        .bool_value => |b| try writer.write_bool(b),
        .null_value => try writer.write_null(),
        .undefined_value => try writer.write_undefined(),
        .int => |i| try writer.write_int(i),
        .float => |f| try writer.write_float(f),
        .bytes => |b| try writer.write_bytes(b),
        .string => |s| try writer.write_string(s),
        .array => |arr| {
            try writer.buffer.append(writer.allocator, @intFromEnum(Tag.array));

            const zig_zagged = zig_zag_encode(@intCast(arr.len));
            try write_uleb128(zig_zagged, writer.buffer.writer(writer.allocator));

            for (arr) |item| {
                try encode_value(writer, item);
            }
        },
        .object => |obj| {
            try writer.buffer.append(writer.allocator, @intFromEnum(Tag.object));

            const zig_zagged = zig_zag_encode(@intCast(obj.count()));
            try write_uleb128(zig_zagged, writer.buffer.writer(writer.allocator));

            var it = obj.iterator();
            while (it.next()) |entry| {
                try writer.write_string(entry.key_ptr.*);
                try encode_value(writer, entry.value_ptr.*);
            }
        },
    }
}

pub fn decode(allocator: Allocator, bytes: []const u8) !Value {
    var reader = Reader.init(bytes);
    return try reader.decode(allocator);
}

test "zig_zag_encode and decode" {
    try std.testing.expectEqual(@as(u64, 0), zig_zag_encode(0));
    try std.testing.expectEqual(@as(u64, 1), zig_zag_encode(-1));
    try std.testing.expectEqual(@as(u64, 2), zig_zag_encode(1));
    try std.testing.expectEqual(@as(u64, 3), zig_zag_encode(-2));
    try std.testing.expectEqual(@as(u64, 4), zig_zag_encode(2));

    try std.testing.expectEqual(@as(i64, 0), zig_zag_decode(0));
    try std.testing.expectEqual(@as(i64, -1), zig_zag_decode(1));
    try std.testing.expectEqual(@as(i64, 1), zig_zag_decode(2));
    try std.testing.expectEqual(@as(i64, -2), zig_zag_decode(3));
    try std.testing.expectEqual(@as(i64, 2), zig_zag_decode(4));
}

test "uleb128 encode and decode" {
    const allocator = std.testing.allocator;

    const test_cases = [_]u64{ 0, 1, 127, 128, 255, 256, 16383, 16384, 0xFFFFFFFF, 0xFFFFFFFFFFFFFFFF };

    for (test_cases) |val| {
        var buf = try ArrayList(u8).initCapacity(allocator, 16);
        defer buf.deinit(allocator);

        try write_uleb128(val, buf.writer(allocator));

        var offset: usize = 0;
        const decoded = try read_uleb128(buf.items, &offset);

        try std.testing.expectEqual(val, decoded);
    }
}

test "encode and decode bool" {
    const allocator = std.testing.allocator;

    const true_val = Value{ .bool_value = true };
    const encoded_true = try encode(allocator, true_val, 16);
    defer allocator.free(encoded_true);

    var decoded_true = try decode(allocator, encoded_true);
    defer decoded_true.deinit(allocator);

    try std.testing.expect(decoded_true == .bool_value);
    try std.testing.expect(decoded_true.bool_value == true);

    const false_val = Value{ .bool_value = false };
    const encoded_false = try encode(allocator, false_val, 16);
    defer allocator.free(encoded_false);

    var decoded_false = try decode(allocator, encoded_false);
    defer decoded_false.deinit(allocator);

    try std.testing.expect(decoded_false == .bool_value);
    try std.testing.expect(decoded_false.bool_value == false);
}

test "encode and decode null and undefined" {
    const allocator = std.testing.allocator;

    const null_val = Value.null_value;
    const encoded_null = try encode(allocator, null_val, 16);
    defer allocator.free(encoded_null);

    var decoded_null = try decode(allocator, encoded_null);
    defer decoded_null.deinit(allocator);

    try std.testing.expect(decoded_null == .null_value);

    const undef_val = Value.undefined_value;
    const encoded_undef = try encode(allocator, undef_val, 16);
    defer allocator.free(encoded_undef);

    var decoded_undef = try decode(allocator, encoded_undef);
    defer decoded_undef.deinit(allocator);

    try std.testing.expect(decoded_undef == .undefined_value);
}

test "encode and decode int" {
    const allocator = std.testing.allocator;

    const test_cases = [_]i64{ 0, 1, -1, 42, -42, 2147483647, -2147483648, 9007199254740991, -9007199254740991 };

    for (test_cases) |num| {
        const val = Value{ .int = num };
        const encoded = try encode(allocator, val, 16);
        defer allocator.free(encoded);

        var decoded = try decode(allocator, encoded);
        defer decoded.deinit(allocator);

        try std.testing.expect(decoded == .int);
        try std.testing.expectEqual(num, decoded.int);
    }
}

test "encode and decode float" {
    const allocator = std.testing.allocator;

    const test_cases = [_]f64{ 0.0, 1.5, -1.5, 3.14159, -3.14159, 1.7976931348623157e308 };

    for (test_cases) |num| {
        const val = Value{ .float = num };
        const encoded = try encode(allocator, val, 16);
        defer allocator.free(encoded);

        var decoded = try decode(allocator, encoded);
        defer decoded.deinit(allocator);

        try std.testing.expect(decoded == .float);
        try std.testing.expectEqual(num, decoded.float);
    }
}

test "encode and decode string" {
    const allocator = std.testing.allocator;

    const str = "Hello, Zig!";
    const val = Value{ .string = try allocator.dupe(u8, str) };
    defer allocator.free(val.string);

    const encoded = try encode(allocator, val, 16);
    defer allocator.free(encoded);

    var decoded = try decode(allocator, encoded);
    defer decoded.deinit(allocator);

    try std.testing.expect(decoded == .string);
    try std.testing.expectEqualStrings(str, decoded.string);
}

test "encode and decode bytes" {
    const allocator = std.testing.allocator;

    const bytes_data = [_]u8{ 0x01, 0x02, 0x03, 0xFF, 0xAB };
    const val = Value{ .bytes = try allocator.dupe(u8, &bytes_data) };
    defer allocator.free(val.bytes);

    const encoded = try encode(allocator, val, 16);
    defer allocator.free(encoded);

    var decoded = try decode(allocator, encoded);
    defer decoded.deinit(allocator);

    try std.testing.expect(decoded == .bytes);
    try std.testing.expectEqualSlices(u8, &bytes_data, decoded.bytes);
}

test "encode and decode array" {
    const allocator = std.testing.allocator;

    var arr = try allocator.alloc(Value, 3);
    arr[0] = Value{ .int = 1 };
    arr[1] = Value{ .int = 2 };
    arr[2] = Value{ .int = 3 };

    const val = Value{ .array = arr };

    const encoded = try encode(allocator, val, 64);
    defer allocator.free(encoded);

    allocator.free(arr);

    var decoded = try decode(allocator, encoded);
    defer decoded.deinit(allocator);

    try std.testing.expect(decoded == .array);
    try std.testing.expectEqual(@as(usize, 3), decoded.array.len);
    try std.testing.expectEqual(@as(i64, 1), decoded.array[0].int);
    try std.testing.expectEqual(@as(i64, 2), decoded.array[1].int);
    try std.testing.expectEqual(@as(i64, 3), decoded.array[2].int);
}

test "encode and decode object" {
    const allocator = std.testing.allocator;

    var obj = std.StringHashMap(Value).init(allocator);
    try obj.put(try allocator.dupe(u8, "name"), Value{ .string = try allocator.dupe(u8, "Alice") });
    try obj.put(try allocator.dupe(u8, "age"), Value{ .int = 30 });

    const val = Value{ .object = obj };

    const encoded = try encode(allocator, val, 128);
    defer allocator.free(encoded);

    var it = obj.iterator();
    while (it.next()) |entry| {
        allocator.free(entry.key_ptr.*);
        entry.value_ptr.deinit(allocator);
    }
    obj.deinit();

    var decoded = try decode(allocator, encoded);
    defer decoded.deinit(allocator);

    try std.testing.expect(decoded == .object);
    try std.testing.expectEqual(@as(usize, 2), decoded.object.count());

    const name = decoded.object.get("name").?;
    try std.testing.expectEqualStrings("Alice", name.string);

    const age = decoded.object.get("age").?;
    try std.testing.expectEqual(@as(i64, 30), age.int);
}

test "encode and decode nested structure" {
    const allocator = std.testing.allocator;

    // Create nested array [[1, 2], [3, 4]]
    var inner1 = try allocator.alloc(Value, 2);
    inner1[0] = Value{ .int = 1 };
    inner1[1] = Value{ .int = 2 };

    var inner2 = try allocator.alloc(Value, 2);
    inner2[0] = Value{ .int = 3 };
    inner2[1] = Value{ .int = 4 };

    var outer = try allocator.alloc(Value, 2);
    outer[0] = Value{ .array = inner1 };
    outer[1] = Value{ .array = inner2 };

    const val = Value{ .array = outer };

    const encoded = try encode(allocator, val, 128);
    defer allocator.free(encoded);

    for (outer) |*item| {
        allocator.free(item.array);
    }
    allocator.free(outer);

    var decoded = try decode(allocator, encoded);
    defer decoded.deinit(allocator);

    try std.testing.expect(decoded == .array);
    try std.testing.expectEqual(@as(usize, 2), decoded.array.len);
    try std.testing.expectEqual(@as(i64, 1), decoded.array[0].array[0].int);
    try std.testing.expectEqual(@as(i64, 2), decoded.array[0].array[1].int);
    try std.testing.expectEqual(@as(i64, 3), decoded.array[1].array[0].int);
    try std.testing.expectEqual(@as(i64, 4), decoded.array[1].array[1].int);
}
