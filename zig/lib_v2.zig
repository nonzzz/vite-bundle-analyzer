const std = @import("std");
const kw = @import("./kw.zig");
const stats = @import("./stats.zig");

const UnifiedModule = stats.UnifiedModule;

extern "env" fn is_match(id_ptr: i32, id_len: usize) i32;

var gpa = std.heap.GeneralPurposeAllocator(.{}){};
const allocator = gpa.allocator();

pub export fn alloc(size: usize) ?[*]u8 {
    const slice = allocator.alloc(u8, size) catch return null;
    return slice.ptr;
}

pub export fn free(ptr: [*]u8, size: usize) void {
    allocator.free(ptr[0..size]);
}

fn resolve_data(data: []const u8) !UnifiedModule {
    var reader = kw.Reader.init(data);

    var unified_module = UnifiedModule{};

    var is_chunk = try reader.decode(allocator);

    defer is_chunk.deinit(allocator);

    if (is_chunk == .bool_value) {
        unified_module.is_chunk = is_chunk.bool_value;
    }

    var file_name = try reader.decode(allocator);
    defer file_name.deinit(allocator);

    if (file_name == .string) {
        unified_module.file_name = file_name.string;
    }

    // decoded.bool_value

}

pub export fn process(data_ptr: [*]const u8, data_len: usize) void {
    const data = data_ptr[0..data_len];

    resolve_data(data);
}
