// Try move this logic to zig and see if it can be faster than the javaScript implementation.
// This is a bit of an experiment, but it could be interesting to see how the performance compares.

const std = @import("std");

const Allocator = std.mem.Allocator;

pub const ModuleEntry = struct {
    path: []const u8,
    parsed_size: u32,
    gzip_size: u32,
    brotli_size: u32,
};

pub const Node = struct {
    parsed_size: u64,
    gzip_size: u64,
    brotli_size: u64,
    children: std.StringArrayHashMap(*Node),

    label: []const u8,
    filename: []const u8,

    flags: packed struct {
        is_end: bool,
        // Mark if already processed to avoid duplicate work
        is_merged: bool,
        reserved: u6 = 0,
    },
    fn init(allocator: Allocator, label: []const u8, filename: []const u8) !*Node {
        const node = try allocator.create(Node);
        node.* = Node{
            .parsed_size = 0,
            .gzip_size = 0,
            .brotli_size = 0,
            .children = std.StringArrayHashMap(*Node).init(allocator),
            .label = label,
            .filename = filename,
            .flags = .{ .is_end = false, .is_merged = false },
        };
        return node;
    }

    fn deinit(self: *Node, allocator: std.mem.Allocator) void {
        var it = self.children.iterator();
        while (it.next()) |entry| {
            const child = entry.value_ptr.*;
            child.deinit(allocator);
        }

        self.children.deinit();

        if (self.label.len > 0) {
            allocator.free(self.label);
        }
        if (self.filename.len > 0) {
            allocator.free(self.filename);
        }

        allocator.destroy(self);
    }
};

pub const Trie = struct {
    const Self = @This();

    root: *Node,
    allocator: std.mem.Allocator,
    cap: u64,

    pub fn init(allocator: Allocator) !Self {
        const root = try Node.init(allocator, "", "");
        return Self{
            .root = root,
            .allocator = allocator,
            .cap = 0,
        };
    }

    pub fn deinit(self: *Trie) void {
        self.root.deinit(self.allocator);
    }

    pub fn insert(self: *Self, entry: ModuleEntry) !void {
        var current = self.root;
        var path_start: usize = 0;
        while (path_start < entry.path.len) {
            while (path_start < entry.path.len and entry.path[path_start] == '/') {
                path_start += 1;
            }
            if (path_start >= entry.path.len) break;

            var path_end = path_start;

            while (path_end < entry.path.len and entry.path[path_end] != '/') {
                path_end += 1;
            }

            const segment = entry.path[path_start..path_end];

            const gop = try current.children.getOrPut(segment);

            if (!gop.found_existing) {
                const seg_copy = try self.allocator.dupe(u8, segment);
                const full_path = try self.allocator.dupe(u8, entry.path[0..path_end]);
                const child = try Node.init(self.allocator, seg_copy, full_path);
                gop.key_ptr.* = seg_copy;
                gop.value_ptr.* = child;
            }
            current = gop.value_ptr.*;
            path_start = path_end;
        }

        current.flags.is_end = true;
        current.parsed_size = entry.parsed_size;
        current.gzip_size = entry.gzip_size;
        current.brotli_size = entry.brotli_size;
        self.cap += 1;
    }

    pub fn merge_leaf(self: *Self) !void {
        try self.merge_place(self.root);
    }

    fn merge_place(self: *Self, node: *Node) !void {
        var child_keys = try std.ArrayList([]const u8).initCapacity(self.allocator, self.cap);

        defer child_keys.deinit(self.allocator);

        var it = node.children.iterator();

        while (it.next()) |entry| {
            try child_keys.append(self.allocator, entry.key_ptr.*);
        }

        for (child_keys.items) |key| {
            if (node.children.get(key)) |child| {
                try self.merge_place(child);
            }
        }

        var merge_keys = try std.ArrayList([]const u8).initCapacity(self.allocator, self.cap);
        defer merge_keys.deinit(self.allocator);

        it = node.children.iterator();
        while (it.next()) |entry| {
            const child = entry.value_ptr.*;
            // Check if this child starts a single-child chain
            if (!child.flags.is_end and child.children.count() == 1 and !child.flags.is_merged) {
                try merge_keys.append(self.allocator, entry.key_ptr.*);
            }
        }

        for (merge_keys.items) |key| {
            if (node.children.get(key)) |chain_start| {
                try self.compress_chain(node, key, chain_start);
            }
        }
    }

    inline fn compress_chain(self: *Self, parent: *Node, key: []const u8, chain_start: *Node) !void {
        var path_segments = try std.ArrayList([]const u8).initCapacity(self.allocator, parent.children.count());
        defer path_segments.deinit(self.allocator);

        var current = chain_start;
        while (!current.flags.is_end and current.children.count() == 1 and !current.flags.is_merged) {
            try path_segments.append(self.allocator, current.label);
            current.flags.is_merged = true; // Mark as processed

            var it = current.children.iterator();
            current = it.next().?.value_ptr.*;
        }

        if (path_segments.items.len <= 1) return;

        var total_len: usize = 0;
        for (path_segments.items) |seg| {
            total_len += seg.len;
        }
        // For '/' separators
        total_len += path_segments.items.len - 1;

        const merged_label = try self.allocator.alloc(u8, total_len);
        var pos: usize = 0;
        for (path_segments.items, 0..) |seg, i| {
            if (i > 0) {
                merged_label[pos] = '/';
                pos += 1;
            }
            @memcpy(merged_label[pos .. pos + seg.len], seg);
            pos += seg.len;
        }

        current.label = merged_label;

        // Atomically update parent's children map
        _ = parent.children.swapRemove(key);
        try parent.children.put(merged_label, current);
    }

    pub fn compute_sizes(self: *Self) void {
        self.compute_sizes_node(self.root);
    }

    fn compute_sizes_node(self: *Self, node: *Node) void {
        if (node.flags.is_end and node.children.count() == 0) return;

        var agg_parsed: u64 = if (node.flags.is_end) node.parsed_size else 0;
        var agg_gzip: u64 = if (node.flags.is_end) node.gzip_size else 0;
        var agg_brotli: u64 = if (node.flags.is_end) node.brotli_size else 0;

        var it = node.children.iterator();
        while (it.next()) |entry| {
            const child = entry.value_ptr.*;
            // Post-order: recurse first
            self.compute_sizes_node(child);
            agg_parsed += child.parsed_size;
            agg_gzip += child.gzip_size;
            agg_brotli += child.brotli_size;
        }

        node.parsed_size = agg_parsed;
        node.gzip_size = agg_gzip;
        node.brotli_size = agg_brotli;
    }
};

test "Trie" {
    const allocator = std.testing.allocator;
    var trie = try Trie.init(allocator);
    defer trie.deinit();

    try trie.insert(.{
        .path = "src/a/index.js",
        .parsed_size = 100,
        .gzip_size = 50,
        .brotli_size = 30,
    });

    try trie.insert(.{
        .path = "src/a/utils.js",
        .parsed_size = 200,
        .gzip_size = 120,
        .brotli_size = 80,
    });

    try trie.insert(.{
        .path = "src/b/index.js",
        .parsed_size = 150,
        .gzip_size = 70,
        .brotli_size = 40,
    });

    try trie.merge_leaf();
    trie.compute_sizes();

    const root = trie.root;
    try std.testing.expect(root.parsed_size == 450);
    try std.testing.expect(root.gzip_size == 240);
    try std.testing.expect(root.brotli_size == 150);

    const src_node = root.children.get("src").?;
    try std.testing.expect(src_node.children.count() == 2);
}
