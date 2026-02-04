const std = @import("std");

pub const ImportType = enum(u8) {
    static_import,
    dynamic_import,
};

pub const ImportRef = struct {
    type: ImportType,
    start: u32,
    len: u32,
};

pub const ScannerConfig = struct {
    max_imports: usize = 1024,

    pub const small = ScannerConfig{ .max_imports = 256 };
    pub const medium = ScannerConfig{ .max_imports = 1024 };
    pub const large = ScannerConfig{ .max_imports = 4096 };
};

pub const ScannerError = error{
    TooManyImports,
    OffsetTooLarge,
    LengthTooLarge,
};

pub fn Scanner(comptime config: ScannerConfig) type {
    return struct {
        const Self = @This();
        const MAX_IMPORTS = config.max_imports;

        source: []const u8,
        pos: usize,

        imports: [MAX_IMPORTS]ImportRef,
        count: usize,

        pub fn init(source: []const u8) Self {
            return .{
                .source = source,
                .pos = 0,
                .imports = undefined,
                .count = 0,
            };
        }

        pub fn get_import(self: *const Self, index: usize) ?[]const u8 {
            if (index >= self.count) return null;
            const ref = self.imports[index];
            return self.source[ref.start..][0..ref.len];
        }

        pub fn get_type(self: *const Self, index: usize) ?ImportType {
            if (index >= self.count) return null;
            return self.imports[index].type;
        }

        pub fn len(self: *const Self) usize {
            return self.count;
        }

        pub fn capacity(self: *const Self) usize {
            _ = self;
            return MAX_IMPORTS;
        }

        pub fn count_by_type(self: *const Self, import_type: ImportType) usize {
            var result: usize = 0;
            for (self.imports[0..self.count]) |ref| {
                if (ref.type == import_type) result += 1;
            }
            return result;
        }

        inline fn add_import(self: *Self, import_type: ImportType, start: usize, length: usize) ScannerError!void {
            if (self.count >= MAX_IMPORTS) return ScannerError.TooManyImports;
            if (start > std.math.maxInt(u32)) return ScannerError.OffsetTooLarge;
            if (length > std.math.maxInt(u32)) return ScannerError.LengthTooLarge;

            self.imports[self.count] = .{
                .type = import_type,
                .start = @intCast(start),
                .len = @intCast(length),
            };
            self.count += 1;
        }

        inline fn skip_whitespace_and_comments(self: *Self) void {
            while (self.pos < self.source.len) {
                const ch = self.source[self.pos];

                if (ch == ' ' or ch == '\t' or ch == '\n' or ch == '\r') {
                    self.pos += 1;
                    continue;
                }

                if (self.pos + 1 < self.source.len and
                    self.source[self.pos] == '/' and
                    self.source[self.pos + 1] == '/')
                {
                    self.pos += 2;
                    while (self.pos < self.source.len and self.source[self.pos] != '\n') {
                        self.pos += 1;
                    }
                    continue;
                }

                if (self.pos + 1 < self.source.len and
                    self.source[self.pos] == '/' and
                    self.source[self.pos + 1] == '*')
                {
                    self.pos += 2;
                    while (self.pos + 1 < self.source.len) {
                        if (self.source[self.pos] == '*' and self.source[self.pos + 1] == '/') {
                            self.pos += 2;
                            break;
                        }
                        self.pos += 1;
                    }
                    continue;
                }

                break;
            }
        }

        inline fn match_keyword(self: *const Self, keyword: []const u8) bool {
            if (self.pos + keyword.len > self.source.len) return false;
            if (!std.mem.eql(u8, self.source[self.pos..][0..keyword.len], keyword)) return false;

            if (self.pos + keyword.len < self.source.len) {
                const next_ch = self.source[self.pos + keyword.len];
                if (std.ascii.isAlphanumeric(next_ch) or next_ch == '_' or next_ch == '$') {
                    return false;
                }
            }

            return true;
        }

        fn parse_string_literal(self: *Self, quote: u8) ?struct { start: usize, len: usize } {
            std.debug.assert(self.source[self.pos] == quote);
            self.pos += 1;

            const start = self.pos;

            while (self.pos < self.source.len) {
                const ch = self.source[self.pos];

                if (ch == quote) {
                    const cap = self.pos - start;
                    self.pos += 1;
                    return .{ .start = start, .len = cap };
                }

                if (ch == '\\' and self.pos + 1 < self.source.len) {
                    self.pos += 2;
                } else {
                    self.pos += 1;
                }
            }

            return null;
        }

        fn scan_static_import(self: *Self) !bool {
            std.debug.assert(self.match_keyword("import"));

            const saved_pos = self.pos;
            self.pos += "import".len;
            self.skip_whitespace_and_comments();

            if (self.pos < self.source.len and self.source[self.pos] == '(') {
                self.pos = saved_pos;
                return false;
            }

            var depth: i32 = 0;
            var found_from = false;

            while (self.pos < self.source.len) {
                self.skip_whitespace_and_comments();
                if (self.pos >= self.source.len) break;

                const ch = self.source[self.pos];

                if (ch == '{') {
                    depth += 1;
                    self.pos += 1;
                } else if (ch == '}') {
                    depth -= 1;
                    self.pos += 1;
                } else if (depth == 0 and self.match_keyword("from")) {
                    found_from = true;
                    self.pos += "from".len;
                    break;
                } else {
                    self.pos += 1;
                }
            }

            if (!found_from) {
                self.pos = saved_pos;
                return false;
            }

            self.skip_whitespace_and_comments();

            if (self.pos < self.source.len) {
                const ch = self.source[self.pos];
                if (ch == '"' or ch == '\'') {
                    if (self.parse_string_literal(ch)) |location| {
                        try self.add_import(.static_import, location.start, location.len);

                        self.skip_whitespace_and_comments();
                        if (self.match_keyword("with") or self.match_keyword("assert")) {
                            const keyword_len = if (self.match_keyword("with")) @as(usize, 4) else @as(usize, 6);
                            self.pos += keyword_len;
                            self.skip_whitespace_and_comments();
                            if (self.pos < self.source.len and self.source[self.pos] == '{') {
                                depth = 1;
                                self.pos += 1;
                                while (self.pos < self.source.len and depth > 0) {
                                    if (self.source[self.pos] == '{') depth += 1;
                                    if (self.source[self.pos] == '}') depth -= 1;
                                    self.pos += 1;
                                }
                            }
                        }
                        return true;
                    }
                }
            }

            self.pos = saved_pos;
            return false;
        }

        fn scan_dynamic_import(self: *Self) !bool {
            std.debug.assert(self.match_keyword("import"));

            const saved_pos = self.pos;
            self.pos += "import".len;
            self.skip_whitespace_and_comments();

            if (self.pos >= self.source.len or self.source[self.pos] != '(') {
                self.pos = saved_pos;
                return false;
            }

            self.pos += 1;
            self.skip_whitespace_and_comments();

            if (self.pos < self.source.len) {
                const ch = self.source[self.pos];
                if (ch == '"' or ch == '\'') {
                    if (self.parse_string_literal(ch)) |location| {
                        try self.add_import(.dynamic_import, location.start, location.len);
                        return true;
                    }
                }
            }

            self.pos = saved_pos;
            return false;
        }

        fn skip_string(self: *Self) void {
            const quote = self.source[self.pos];
            _ = self.parse_string_literal(quote);
        }

        fn skip_template_literal(self: *Self) void {
            std.debug.assert(self.source[self.pos] == '`');
            self.pos += 1;

            while (self.pos < self.source.len) {
                const ch = self.source[self.pos];

                if (ch == '`') {
                    self.pos += 1;
                    return;
                }

                if (ch == '\\' and self.pos + 1 < self.source.len) {
                    self.pos += 2;
                } else if (ch == '$' and self.pos + 1 < self.source.len and self.source[self.pos + 1] == '{') {
                    self.pos += 2;
                    var depth: i32 = 1;
                    while (self.pos < self.source.len and depth > 0) {
                        if (self.source[self.pos] == '{') depth += 1;
                        if (self.source[self.pos] == '}') depth -= 1;
                        self.pos += 1;
                    }
                } else {
                    self.pos += 1;
                }
            }
        }

        pub fn scan(self: *Self) !void {
            self.pos = 0;
            self.count = 0;

            while (self.pos < self.source.len) {
                const ch = self.source[self.pos];

                if (ch == '"' or ch == '\'') {
                    self.skip_string();
                    continue;
                }

                if (ch == '`') {
                    self.skip_template_literal();
                    continue;
                }

                if (self.pos + 1 < self.source.len and ch == '/') {
                    if (self.source[self.pos + 1] == '/' or self.source[self.pos + 1] == '*') {
                        self.skip_whitespace_and_comments();
                        continue;
                    }
                }

                if (self.match_keyword("import")) {
                    if (try self.scan_dynamic_import()) continue;

                    if (try self.scan_static_import()) continue;
                }

                self.pos += 1;
            }
        }
    };
}

pub fn ImportIterator(comptime ScannerType: type) type {
    return struct {
        scanner: *const ScannerType,
        index: usize,

        pub fn next(self: *@This()) ?struct { type: ImportType, specifier: []const u8 } {
            if (self.index >= self.scanner.count) return null;

            const import_type = self.scanner.get_type(self.index).?;
            const specifier = self.scanner.get_import(self.index).?;
            self.index += 1;

            return .{ .type = import_type, .specifier = specifier };
        }
    };
}

test "custom scanner size" {
    const CustomScanner = Scanner(.{ .max_imports = 10 });

    const source = "import foo from 'foo'";
    var scanner = CustomScanner.init(source);
    try scanner.scan();

    try std.testing.expectEqual(@as(usize, 1), scanner.len());
    try std.testing.expectEqual(@as(usize, 10), scanner.capacity());
}

test "error handling - too many imports" {
    const TinyScanner = Scanner(.{ .max_imports = 2 });

    const source =
        \\import a from 'a'
        \\import b from 'b'
        \\import c from 'c'
    ;

    var scanner = TinyScanner.init(source);

    const result = scanner.scan();
    try std.testing.expectError(ScannerError.TooManyImports, result);
}

test "error handling with catch" {
    const TinyScanner = Scanner(.{ .max_imports = 1 });

    const source =
        \\import a from 'a'
        \\import b from 'b'
    ;

    var scanner = TinyScanner.init(source);

    scanner.scan() catch |err| {
        switch (err) {
            ScannerError.TooManyImports => {
                try std.testing.expectEqual(@as(usize, 1), scanner.len());
                return;
            },
            else => return err,
        }
    };

    try std.testing.expect(false);
}

test "iterator with custom scanner" {
    const source =
        \\import foo from 'foo'
        \\import('bar')
    ;

    var scanner = Scanner(.{ .max_imports = 1024 }).init(source);
    try scanner.scan();

    var iter = ImportIterator(Scanner(.{ .max_imports = 1024 })){ .scanner = &scanner, .index = 0 };

    const first = iter.next().?;
    try std.testing.expectEqual(ImportType.static_import, first.type);
    try std.testing.expectEqualStrings("foo", first.specifier);

    const second = iter.next().?;
    try std.testing.expectEqual(ImportType.dynamic_import, second.type);
    try std.testing.expectEqualStrings("bar", second.specifier);
}
