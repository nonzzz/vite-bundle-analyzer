const std = @import("std");
const trie = @import("./trie.zig");
const fs = @import("./fs.zig");
const sourcemap = @import("./sourcemap_dec.zig");

const Allocator = std.mem.Allocator;
const ArrayList = std.ArrayList;
const ModuleEntry = trie.ModuleEntry;

// deine with src/server/connect.ts don't forget sync it
pub const UnifiedModule = struct {
    is_chunk: bool,
    file_name: []const u8,
    resource: []const u8,
    is_entry: ?bool,
    sourcemap_mappings_str: ?[]const u8,
};

pub const Stats = struct {
    const Self = @This();

    allocator: Allocator,
    source: ArrayList(ModuleEntry),

    pub fn init(allocator: Allocator) Self {
        return Self{
            .allocator = allocator,
        };
    }

    pub fn deinit(self: *Self) void {
        _ = self; // autofix

    }

    pub fn analysis(self: *Self, module: *UnifiedModule) void {
        if (module.is_chunk) {
            self.analysis_chunk(module);
        }
    }

    inline fn analysis_chunk(self: *Self, moudle: *UnifiedModule) void {
        _ = moudle; // autofix
        _ = self; // autofix
    }
};

test "stats" {
    const allocator = std.testing.allocator;
    var stats = Stats.init(allocator);
    defer stats.deinit();

    const default_wd = try fs.get_default_wd(allocator);

    const file_content = try fs.read_file(allocator, &[_][]const u8{
        default_wd,
        "/__tests__/fixtures/source-map/babylon/babylon.js.map",
    });
    const js_content = try fs.read_file(allocator, &[_][]const u8{
        default_wd,
        "/__tests__/fixtures/source-map/babylon/babylon.js",
    });
    defer {
        allocator.free(default_wd);
        allocator.free(file_content);
        allocator.free(js_content);
    }

    var val: std.json.Parsed(sourcemap.SourceMapV3) = try std.json.parseFromSlice(
        sourcemap.SourceMapV3,
        allocator,
        file_content,
        .{
            .allocate = .alloc_always,
            .ignore_unknown_fields = true,
        },
    );
    defer val.deinit();

    var module = UnifiedModule{
        .is_chunk = true,
        .file_name = val.value.file,
        .resource = js_content,
        .is_entry = true,
        .sourcemap_mappings_str = val.value.mappings,
    };

    stats.analysis(&module);
}
