const std = @import("std");

const StepDef = struct {
    name: [:0]const u8,
    desc: [:0]const u8,
};

fn BuildStepsType(comptime step_defs: []const StepDef) type {
    return struct {
        const Self = @This();

        pub const StepType = blk: {
            var fields: [step_defs.len]std.builtin.Type.EnumField = undefined;
            for (step_defs, 0..) |def, i| {
                fields[i] = .{
                    .name = def.name,
                    .value = i,
                };
            }
            break :blk @Type(.{
                .@"enum" = .{
                    .tag_type = u32,
                    .fields = &fields,
                    .decls = &.{},
                    .is_exhaustive = true,
                },
            });
        };

        steps: std.EnumArray(StepType, *std.Build.Step),
        npm_ready_step: *std.Build.Step,

        pub fn to_string(step_type: StepType) [:0]const u8 {
            return @tagName(step_type);
        }

        pub fn description(step_type: StepType) [:0]const u8 {
            inline for (step_defs, 0..) |def, i| {
                if (i == @intFromEnum(step_type)) {
                    return def.desc;
                }
            }
            unreachable;
        }

        pub fn get(self: *const Self, step_type: StepType) *std.Build.Step {
            return self.steps.get(step_type);
        }

        pub fn set(self: *Self, step_type: StepType, step: *std.Build.Step) void {
            self.steps.set(step_type, step);
        }

        pub fn add_npm_command(self: *const Self, b: *std.Build, argv: []const []const u8) *std.Build.Step.Run {
            const cmd = b.addSystemCommand(argv);
            cmd.step.dependOn(self.npm_ready_step);
            return cmd;
        }

        pub fn init(b: *std.Build) Self {
            var self: Self = .{
                .steps = undefined,
                .npm_ready_step = undefined,
            };

            inline for (step_defs, 0..) |def, i| {
                const step_type: StepType = @enumFromInt(i);
                const step = b.step(def.name, def.desc);
                self.steps.set(step_type, step);
            }

            return self;
        }
    };
}

const WasmOptions = struct {
    emit_javascript: bool,
};

const BuildSteps = BuildStepsType(&.{
    .{ .name = "zig_test", .desc = "Run Zig unit tests" },
    .{ .name = "typescript_test", .desc = "Run TypeScript tests" },
    .{ .name = "typescript_typings_test", .desc = "Run TypeScript typings tests" },
    .{ .name = "all_test", .desc = "Run all tests" },
    .{ .name = "wasm_bindings", .desc = "Generate WASM bindings" },
    .{ .name = "install_npm_deps", .desc = "Install npm dependencies" },
    .{ .name = "build_client", .desc = "Build client" },
    .{ .name = "build_server", .desc = "Build server" },
    .{ .name = "build_all", .desc = "Build all" },
    .{ .name = "server_analyze", .desc = "Analyze server code" },
    .{ .name = "client_analyze", .desc = "Analyze client code" },
    .{ .name = "dev_client", .desc = "Start client in dev mode" },
    .{ .name = "lint", .desc = "Lint code" },
    .{ .name = "format", .desc = "Format code" },
    .{ .name = "publish", .desc = "Publish package" },
});

pub fn build(b: *std.Build) void {
    const wasm_options = WasmOptions{
        .emit_javascript = b.option(bool, "emit-javascript", "Emit javascript bindings for custom tests") orelse false,
    };

    var build_steps = BuildSteps.init(b);

    const install_npm_deps_step = build_steps.get(.install_npm_deps);

    const zig_test_step = build_steps.get(.zig_test);
    const typescript_typings_test_step = build_steps.get(.typescript_typings_test);

    const build_wasm_bindings_step = build_steps.get(.wasm_bindings);

    const lint_step = build_steps.get(.lint);

    const format_step = build_steps.get(.format);

    const build_client_step = build_steps.get(.build_client);

    const build_server_step = build_steps.get(.build_server);

    const build_all_step = build_steps.get(.build_all);

    const server_analyze_step = build_steps.get(.server_analyze);

    const client_analyze_step = build_steps.get(.client_analyze);

    const dev_client_step = build_steps.get(.dev_client);

    const publish_step = build_steps.get(.publish);

    const installer_step = install_npm_deps(b);

    install_npm_deps_step.dependOn(installer_step);

    const npm_ready_step = b.step("_npm_ready", "Ensure npm deps are ready");
    // install npm dependencies
    const exist = check_npm_deps_exist();

    if (!exist) {
        std.log.warn("⚠️  node_modules not found, will install on first use", .{});
        npm_ready_step.dependOn(installer_step);
    }

    build_steps.npm_ready_step = npm_ready_step;

    add_npm_dependencies(build_steps, npm_ready_step);

    const zig_test_last = build_zig_test(b, zig_test_step);

    const wasm_last = build_wasm_bindings(b, &build_steps, build_wasm_bindings_step, wasm_options);

    const ts_typings_last = build_typescript_typings_test(b, &build_steps, typescript_typings_test_step);

    build_all_test(b, &build_steps, zig_test_last, wasm_last, ts_typings_last);

    build_client(b, &build_steps, build_client_step);

    build_server(b, &build_steps, build_server_step);

    build_all(b, &build_steps, build_all_step);

    lint(b, &build_steps, lint_step);

    format(b, &build_steps, format_step);

    build_publish(b, &build_steps, publish_step);

    dev_client(b, &build_steps, dev_client_step);

    server_analyze(b, &build_steps, server_analyze_step);
    client_analyze(b, &build_steps, client_analyze_step);
}

fn build_zig_test(b: *std.Build, step: *std.Build.Step) *std.Build.Step {
    const target = b.standardTargetOptions(.{});
    const optimize = b.standardOptimizeOption(.{});

    const mod = b.addModule("zig_unit_test", .{
        .root_source_file = b.path("zig/unit_test.zig"),
        .target = target,
        .optimize = optimize,
    });

    const zig_unit_test = b.addTest(.{
        .root_module = mod,
    });

    const run_step = b.addRunArtifact(zig_unit_test);

    step.dependOn(&run_step.step);

    return &run_step.step;
}

fn build_typescript_typings_test(b: *std.Build, build_steps: *const BuildSteps, step: *std.Build.Step) *std.Build.Step {
    const tsc_cmd = build_steps.add_npm_command(b, &.{
        "sh",
        "-c",
        "pnpm --dir type-check exec tsc && echo '✅ Type check passed' || (echo '❌ Type check failed' && exit 1)",
    });

    step.dependOn(&tsc_cmd.step);

    return &tsc_cmd.step;
}

fn build_wasm_bindings(b: *std.Build, build_steps: *const BuildSteps, step: *std.Build.Step, options: WasmOptions) *std.Build.Step {
    const wasm_target = b.resolveTargetQuery(.{
        .cpu_arch = .wasm32,
        .os_tag = .freestanding,
    });

    const mod = b.addModule("scan.wasm", .{
        .root_source_file = b.path("zig/lib.zig"),
        .target = wasm_target,
        .optimize = .ReleaseSmall,
    });

    const generate_bindings = b.addExecutable(.{
        .name = "scan",
        .root_module = mod,
    });

    generate_bindings.rdynamic = true;
    generate_bindings.entry = .disabled;

    const wasm_install_file = b.addInstallFile(generate_bindings.getEmittedBin(), "scan.wasm");

    step.dependOn(&wasm_install_file.step);

    if (!options.emit_javascript) {
        return &wasm_install_file.step;
    }

    const js_bindings_cmd = build_steps.add_npm_command(b, &.{
        "pnpm",
        "exec",
        "rollup",
        "-c",
        "./configs/zig.config.ts",
        "--configPlugin",
        "swc3",
    });

    js_bindings_cmd.step.dependOn(&wasm_install_file.step);
    step.dependOn(&js_bindings_cmd.step);

    return &js_bindings_cmd.step;
}

fn build_all_test(
    b: *std.Build,
    build_steps: *const BuildSteps,
    zig_test_last: *std.Build.Step,
    wasm_last: *std.Build.Step,
    ts_typings_last: *std.Build.Step,
) void {
    const all_test = build_steps.get(.all_test);

    const echo1 = b.addSystemCommand(&.{ "echo", "Running Zig tests..." });
    zig_test_last.dependOn(&echo1.step);

    const echo2 = b.addSystemCommand(&.{ "echo", "Generating WASM bindings..." });
    echo2.step.dependOn(zig_test_last);
    wasm_last.dependOn(&echo2.step);

    const echo3 = b.addSystemCommand(&.{ "echo", "Running TypeScript typings tests..." });
    echo3.step.dependOn(wasm_last);
    ts_typings_last.dependOn(&echo3.step);

    const echo_vitest_cmd = b.addSystemCommand(&.{ "echo", "Running Vitest tests..." });
    echo_vitest_cmd.step.dependOn(ts_typings_last);
    const vitest_cmd = build_steps.add_npm_command(b, &.{
        "pnpm",
        "exec",
        "vitest",
        "--coverage",
    });
    vitest_cmd.step.dependOn(&echo_vitest_cmd.step);

    all_test.dependOn(&vitest_cmd.step);
}

fn check_npm_deps_exist() bool {
    const stat = std.fs.cwd().statFile("node_modules") catch return false;
    return stat.kind == .directory;
}

fn install_npm_deps(b: *std.Build) *std.Build.Step {
    const install_corepack = b.addSystemCommand(&.{
        "npm",
        "install",
        "-g",
        "corepack@latest",
        "--force",
    });

    const enable_corepack = b.addSystemCommand(&.{ "corepack", "enable" });

    enable_corepack.step.dependOn(&install_corepack.step);

    const pnpm_install = b.addSystemCommand(&.{
        "pnpm",
        "install",
    });

    pnpm_install.step.dependOn(&enable_corepack.step);

    return &pnpm_install.step;
}

fn lint(b: *std.Build, build_steps: *const BuildSteps, step: *std.Build.Step) void {
    const echo_cmd = b.addSystemCommand(&.{ "echo", "Linting code..." });

    step.dependOn(&echo_cmd.step);

    const eslint_cmd = build_steps.add_npm_command(b, &.{
        "pnpm",
        "exec",
        "eslint",
        ".",
        "--fix",
    });
    eslint_cmd.step.dependOn(&echo_cmd.step);

    step.dependOn(&eslint_cmd.step);
}

fn format(b: *std.Build, build_steps: *const BuildSteps, step: *std.Build.Step) void {
    const echo_cmd = b.addSystemCommand(&.{ "echo", "Formatting code..." });

    step.dependOn(&echo_cmd.step);

    const dprint_cmd = build_steps.add_npm_command(b, &.{
        "pnpm",
        "exec",
        "dprint",
        "fmt",
    });
    dprint_cmd.step.dependOn(&echo_cmd.step);

    step.dependOn(&dprint_cmd.step);
}

fn build_client(b: *std.Build, build_steps: *const BuildSteps, step: *std.Build.Step) void {
    const echo_cmd = b.addSystemCommand(&.{ "echo", "Building client code..." });
    step.dependOn(&echo_cmd.step);

    const vite_build_cmd = build_steps.add_npm_command(b, &.{
        "pnpm",
        "exec",
        "vite",
        "build",
        "src/client/",
    });

    vite_build_cmd.step.dependOn(&echo_cmd.step);

    const clean_html_cmd = b.addSystemCommand(&.{
        "sh",
        "-c",
        \\awk 'BEGIN { RS=""; FS=""; ORS="" } { gsub(/<script[^>]*>[\s\S]*?<\/script>/, ""); gsub(/<link[^>]*rel="stylesheet"[^>]*>/, ""); gsub(/<title>[^<]*<\/title>/, ""); gsub(/[ \t\n\r]+/, " "); print }' dist/client/index.html > dist/client/index.tmp && mv dist/client/index.tmp dist/client/index.html
        ,
    });
    clean_html_cmd.step.dependOn(&vite_build_cmd.step);

    step.dependOn(&clean_html_cmd.step);
}

fn build_server(b: *std.Build, build_steps: *const BuildSteps, step: *std.Build.Step) void {
    const build_client_step = build_steps.get(.build_client);

    step.dependOn(build_client_step);

    const echo_cmd = b.addSystemCommand(&.{ "echo", "Building server code..." });
    echo_cmd.step.dependOn(build_client_step);
    step.dependOn(&echo_cmd.step);

    const tsx_cmd = build_steps.add_npm_command(b, &.{
        "sh",
        "-c",
        "./node_modules/.bin/tsx ./pre-compile.ts > dist/html.mjs",
    });

    tsx_cmd.step.dependOn(&echo_cmd.step);

    step.dependOn(&tsx_cmd.step);

    const rollup_cmd = build_steps.add_npm_command(b, &.{
        "pnpm",
        "exec",
        "rollup",
        "-c",
        "./configs/rollup.config.ts",
        "--configPlugin",
        "swc3",
    });

    rollup_cmd.step.dependOn(&tsx_cmd.step);

    step.dependOn(&rollup_cmd.step);

    const rm_cmd = b.addSystemCommand(&.{ "rm", "-rf", "dist/cli.mjs" });
    rm_cmd.has_side_effects = true;
    rm_cmd.step.dependOn(&rollup_cmd.step);

    const awk_cmd = b.addSystemCommand(&.{
        "sh",
        "-c",
        "awk '{ print }' bin.txt > dist/bin.js",
    });
    awk_cmd.step.dependOn(&rm_cmd.step);

    step.dependOn(&awk_cmd.step);
}

fn build_all(b: *std.Build, build_steps: *const BuildSteps, step: *std.Build.Step) void {
    const build_server_step = build_steps.get(.build_server);

    step.dependOn(build_server_step);

    const echo_cmd = b.addSystemCommand(&.{ "echo", "Build complete!" });
    echo_cmd.step.dependOn(build_server_step);

    const rm_client = b.addSystemCommand(&.{ "rm", "-rf", "dist/client" });
    rm_client.step.dependOn(&echo_cmd.step);

    step.dependOn(&rm_client.step);
}

fn build_publish(b: *std.Build, build_steps: *const BuildSteps, step: *std.Build.Step) void {
    const build_all_step = build_steps.get(.build_all);
    step.dependOn(build_all_step);
    const echo_cmd = b.addSystemCommand(&.{ "echo", "Publishing package..." });
    echo_cmd.step.dependOn(build_all_step);

    const publish_cmd = b.addSystemCommand(&.{
        "sh",
        "-c",
        \\VERSION=$(awk -F'"' '/"version":/ {print $4}' package.json) && \
        \\TAG=$(echo $VERSION | awk -F'-' '{if (NF > 1) print $2; else print ""}' | cut -d'.' -f1) && \
        \\FLAGS="--access public" && \
        \\if [ "$TAG" != "" ]; then FLAGS="$FLAGS --tag $TAG"; fi && \
        \\npm publish $FLAGS --provenance
        ,
    });

    publish_cmd.step.dependOn(&echo_cmd.step);

    step.dependOn(&publish_cmd.step);
}

fn dev_client(b: *std.Build, build_steps: *const BuildSteps, step: *std.Build.Step) void {
    const vite_dev_cmd = build_steps.add_npm_command(b, &.{ "pnpm", "exec", "vite", "src/client" });

    step.dependOn(&vite_dev_cmd.step);
}

fn server_analyze(b: *std.Build, build_steps: *const BuildSteps, step: *std.Build.Step) void {
    const analyze_cmd = build_steps.add_npm_command(b, &.{
        "pnpm",
        "exec",
        "rolldown",
        "-c",
        "./configs/analyze.server.ts",
    });

    step.dependOn(&analyze_cmd.step);
}

fn client_analyze(b: *std.Build, build_steps: *const BuildSteps, step: *std.Build.Step) void {
    const analyze_cmd = build_steps.add_npm_command(b, &.{
        "pnpm",
        "exec",
        "vite",
        "build",
        "src/client",
        "--config",
        "./configs/analyze.client.ts",
    });

    const awk_cmd = b.addSystemCommand(&.{
        "sh",
        "-c",
        "awk '{ print }' dist/client/stats.json > src/client/data.json",
    });

    awk_cmd.step.dependOn(&analyze_cmd.step);

    step.dependOn(&awk_cmd.step);
}

fn add_npm_dependencies(
    build_steps: BuildSteps,
    npm_ready_step: *std.Build.Step,
) void {
    inline for (@typeInfo(BuildSteps.StepType).@"enum".fields) |field| {
        const step_type: BuildSteps.StepType = @enumFromInt(field.value);

        if (step_type == .install_npm_deps) {
            continue;
        }

        build_steps.get(step_type).dependOn(npm_ready_step);
    }
}
