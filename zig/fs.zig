const std = @import("std");

pub fn read_file(allocator: std.mem.Allocator, file_path: []const []const u8) ![]const u8 {
    const full_path = try std.fs.path.join(allocator, file_path);
    defer allocator.free(full_path);

    const file = try std.fs.openFileAbsolute(full_path, .{ .mode = .read_only });
    defer file.close();

    const contents = try file.readToEndAlloc(allocator, std.math.maxInt(usize));

    return contents;
}

pub fn get_default_wd(allocator: std.mem.Allocator) ![]const u8 {
    const cwd = std.fs.cwd();

    const path = try cwd.realpathAlloc(allocator, ".");

    return path;
}
