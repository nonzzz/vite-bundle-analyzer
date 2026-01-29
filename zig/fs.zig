const std = @import("std");
const pascal_string = @import("./pascal_string.zig");

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

pub fn encode_source_map_as_pascal_string(allocator: std.mem.Allocator, source_map: []const u8) ![]const u8 {
    const parsed = try std.json.parseFromSlice(std.json.Value, allocator, source_map, .{});
    defer parsed.deinit();

    const root = parsed.value.object;

    var pascal_string_encoder = try pascal_string.Encoder.init(allocator);
    defer pascal_string_encoder.deinit();

    if (root.get("version")) |v| {
        const version_str = try std.fmt.allocPrint(allocator, "{d}", .{v.integer});
        defer allocator.free(version_str);
        try pascal_string_encoder.put("version", version_str);
    }

    if (root.get("file")) |f| {
        try pascal_string_encoder.put("file", f.string);
    }

    if (root.get("sourceRoot")) |sr| {
        try pascal_string_encoder.put("sourceRoot", sr.string);
    }

    if (root.get("mappings")) |m| {
        try pascal_string_encoder.put("mappings", m.string);
    }

    if (root.get("sources")) |sources| {
        var sources_encoder = try pascal_string.ArrayEncoder.init(allocator);
        defer sources_encoder.deinit();

        for (sources.array.items) |source| {
            const source_str = if (source == .string) source.string else "";
            try sources_encoder.push(source_str);
        }

        const sources_bytes = try sources_encoder.toOwnedSlice();
        defer allocator.free(sources_bytes);

        try pascal_string_encoder.put("sources", sources_bytes);
    }

    if (root.get("names")) |names| {
        var names_encoder = try pascal_string.ArrayEncoder.init(allocator);
        defer names_encoder.deinit();

        for (names.array.items) |name| {
            const name_str = if (name == .string) name.string else "";
            try names_encoder.push(name_str);
        }

        const names_bytes = try names_encoder.toOwnedSlice();
        defer allocator.free(names_bytes);

        try pascal_string_encoder.put("names", names_bytes);
    }

    if (root.get("sourcesContent")) |sc| {
        var sc_encoder = try pascal_string.ArrayEncoder.init(allocator);
        defer sc_encoder.deinit();

        for (sc.array.items) |content| {
            const content_str = if (content == .string) content.string else "";
            try sc_encoder.push(content_str);
        }

        const sc_bytes = try sc_encoder.toOwnedSlice();
        defer allocator.free(sc_bytes);

        try pascal_string_encoder.put("sourcesContent", sc_bytes);
    }

    return pascal_string_encoder.toOwnedSlice();
}
