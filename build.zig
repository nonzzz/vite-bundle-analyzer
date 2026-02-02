const std = @import("std");

const BuildSteps = struct {
    unit_test: *std.Build.Step,
    wasm: *std.Build.Step,
    wasm_javascript_bindings: *std.Build.Step,
    install_npm_deps: *std.Build.Step,
    client_analyze: *std.Build.Step,
    server_analyze: *std.Build.Step,
    build_all: *std.Build.Step,
    cleanup_client: *std.Build.Step,
    cleanup: *std.Build.Step,
    build_client: *std.Build.Step,
    build_server: *std.Build.Step,
    dev_client: *std.Build.Step,
    test_all: *std.Build.Step,
    test_types: *std.Build.Step,
    lint: *std.Build.Step,
    format: *std.Build.Step,
    publish: *std.Build.Step,
};

pub fn build(b: *std.Build) void {
    const target = b.standardTargetOptions(.{});
    const optimize = b.standardOptimizeOption(.{});

    const build_steps = BuildSteps{
        .unit_test = b.step("unit_test", "Run zig part unit test case"),
        .wasm = b.step("wasm", "Build wasm artifacts"),
        .wasm_javascript_bindings = b.step("wasm_javascript_bindings", "Build wasm javascript bindings"),
        .install_npm_deps = b.step("install_npm_deps", "Install dependencies using pnpm"),
        .client_analyze = b.step("client_analyze", "Analyze client code"),
        .server_analyze = b.step("server_analyze", "Analyze server code"),
        .build_all = b.step("build_all", "Build all components"),
        .cleanup_client = b.step("cleanup_client", "Clean up client dist directory"),
        .cleanup = b.step("cleanup", "Clean up dist directory"),
        .build_client = b.step("build_client", "Build client code"),
        .build_server = b.step("build_server", "Build server code"),
        .dev_client = b.step("dev_client", "Start client in development mode"),
        .test_all = b.step("test", "Run tests with coverage"),
        .test_types = b.step("test_types", "Run type tests"),
        .lint = b.step("lint", "Lint code"),
        .format = b.step("format", "Format code"),
        .publish = b.step("publish", "Publish package to npm"),
    };

    build_unit_test(b, build_steps.unit_test, target, optimize);

    _ = build_wasm_lib(b, build_steps.wasm);

    build_wasm_javascript_bindings(b, build_steps.wasm_javascript_bindings);

    build_install(b, build_steps.install_npm_deps);

    build_client_analyze(b, build_steps.client_analyze);

    build_server_analyze(b, build_steps.server_analyze);

    build_cleanup_client(b, build_steps.cleanup_client);

    build_cleanup(b, build_steps.cleanup);

    build_client_target(b, build_steps.build_client);

    build_server_target(b, build_steps.build_server, build_steps.build_client);

    build_build_all(b, build_steps.build_all, build_steps.cleanup, build_steps.build_server, build_steps.cleanup_client);

    build_dev_client(b, build_steps.dev_client);

    build_test_types(b, build_steps.test_types);

    build_test_all(b, build_steps.test_all, build_steps.test_types);

    build_lint(b, build_steps.lint);

    build_format(b, build_steps.format);

    build_publish(b, build_steps.publish, build_steps.build_all);
}

fn build_unit_test(
    b: *std.Build,
    step_unit_test: *std.Build.Step,
    target: std.Build.ResolvedTarget,
    optimize: std.builtin.OptimizeMode,
) void {
    const mod = b.addModule("unit_test", .{
        .root_source_file = b.path("zig/unit_test.zig"),
        .target = target,
        .optimize = optimize,
    });

    const unit_tests = b.addTest(.{
        .root_module = mod,
        .filters = b.args orelse &.{},
    });
    const run_unit_tests = b.addRunArtifact(unit_tests);
    step_unit_test.dependOn(&run_unit_tests.step);
}

fn build_wasm_lib(
    b: *std.Build,
    step_wasm: *std.Build.Step,
) *std.Build.Step.InstallFile {
    const wasm_target = b.resolveTargetQuery(.{
        .cpu_arch = .wasm32,
        .os_tag = .freestanding,
    });

    const wasm_mod = b.addModule("scan.wasm", .{
        .root_source_file = b.path("zig/lib.zig"),
        .target = wasm_target,
        .optimize = .ReleaseSmall,
    });

    const wasm_generate = b.addExecutable(.{
        .name = "candle",
        .root_module = wasm_mod,
    });

    wasm_generate.rdynamic = true;
    wasm_generate.entry = .disabled;

    const wasm_install = b.addInstallFile(
        wasm_generate.getEmittedBin(),
        "scan.wasm",
    );

    step_wasm.dependOn(&wasm_install.step);
    return wasm_install;
}

fn build_wasm_javascript_bindings(
    b: *std.Build,
    step_wasm_javascript: *std.Build.Step,
) void {
    const wasm_install_step = build_wasm_lib(b, step_wasm_javascript);
    step_wasm_javascript.dependOn(&wasm_install_step.step);

    const command = b.addSystemCommand(&.{
        "pnpm",
        "exec",
        "rollup",
        "-c",
        "./zig/rollup.config.ts",
        "--configPlugin",
        "swc3",
    });
    command.step.dependOn(&wasm_install_step.step);
    step_wasm_javascript.dependOn(&command.step);
}

fn build_install(b: *std.Build, step_install: *std.Build.Step) void {
    const echo_cmd = b.addSystemCommand(&.{ "echo", "Using pnpm to install dependencies..." });
    step_install.dependOn(&echo_cmd.step);

    const install_corepack = b.addSystemCommand(&.{
        "npm",
        "install",
        "-g",
        "corepack@latest",
        "--force",
    });
    install_corepack.step.dependOn(&echo_cmd.step);

    const enable_corepack = b.addSystemCommand(&.{ "corepack", "enable" });
    enable_corepack.step.dependOn(&install_corepack.step);

    const pnpm_install = b.addSystemCommand(&.{ "pnpm", "install" });
    pnpm_install.step.dependOn(&enable_corepack.step);

    step_install.dependOn(&pnpm_install.step);
}

fn build_client_analyze(b: *std.Build, step: *std.Build.Step) void {
    const echo_cmd = b.addSystemCommand(&.{ "echo", "Analyzing client code..." });
    step.dependOn(&echo_cmd.step);

    const vite_build = b.addSystemCommand(&.{
        "pnpm",
        "exec",
        "vite",
        "build",
        "src/client",
        "--config",
        "analyze.config.ts",
    });
    vite_build.step.dependOn(&echo_cmd.step);

    const awk_cmd = b.addSystemCommand(&.{
        "sh",
        "-c",
        "awk '{ print }' dist/client/stats.json > src/client/data.json",
    });
    awk_cmd.step.dependOn(&vite_build.step);

    step.dependOn(&awk_cmd.step);
}

fn build_server_analyze(b: *std.Build, step: *std.Build.Step) void {
    const echo_cmd = b.addSystemCommand(&.{ "echo", "Analyzing server code..." });
    step.dependOn(&echo_cmd.step);

    const rm_cmd = b.addSystemCommand(&.{ "rm", "-rf", "analysis" });
    rm_cmd.step.dependOn(&echo_cmd.step);
    rm_cmd.has_side_effects = true;

    const rolldown_cmd = b.addSystemCommand(&.{
        "./node_modules/.bin/rolldown",
        "--config",
        "analyze.server.mjs",
    });
    rolldown_cmd.step.dependOn(&rm_cmd.step);

    step.dependOn(&rolldown_cmd.step);
}

fn build_cleanup_client(b: *std.Build, step: *std.Build.Step) void {
    const rm_cmd = b.addSystemCommand(&.{ "rm", "-rf", "dist/client" });
    rm_cmd.has_side_effects = true;
    step.dependOn(&rm_cmd.step);
}

fn build_cleanup(b: *std.Build, step: *std.Build.Step) void {
    const rm_cmd = b.addSystemCommand(&.{ "rm", "-rf", "dist" });
    rm_cmd.has_side_effects = true;
    step.dependOn(&rm_cmd.step);
}

fn build_client_target(b: *std.Build, step: *std.Build.Step) void {
    const echo_cmd = b.addSystemCommand(&.{ "echo", "Building client code..." });
    step.dependOn(&echo_cmd.step);

    const vite_build = b.addSystemCommand(&.{
        "pnpm",
        "exec",
        "vite",
        "build",
        "src/client",
    });
    vite_build.step.dependOn(&echo_cmd.step);

    const clean_html_cmd = b.addSystemCommand(&.{
        "sh",
        "-c",
        \\awk 'BEGIN { RS=""; FS=""; ORS="" } { gsub(/<script[^>]*>[\s\S]*?<\/script>/, ""); gsub(/<link[^>]*rel="stylesheet"[^>]*>/, ""); gsub(/<title>[^<]*<\/title>/, ""); gsub(/[ \t\n\r]+/, " "); print }' dist/client/index.html > dist/client/index.tmp && mv dist/client/index.tmp dist/client/index.html
        ,
    });
    clean_html_cmd.step.dependOn(&vite_build.step);

    step.dependOn(&clean_html_cmd.step);
}

fn build_server_target(
    b: *std.Build,
    step: *std.Build.Step,
    build_client_step: *std.Build.Step,
) void {
    step.dependOn(build_client_step);

    const echo_cmd = b.addSystemCommand(&.{ "echo", "Building server code..." });
    echo_cmd.step.dependOn(build_client_step);

    const tsx_cmd = b.addSystemCommand(&.{
        "sh",
        "-c",
        "./node_modules/.bin/tsx ./pre-compile.ts > dist/html.mjs",
    });
    tsx_cmd.step.dependOn(&echo_cmd.step);

    const rollup_cmd = b.addSystemCommand(&.{
        "./node_modules/.bin/rollup",
        "--config",
        "rollup.config.ts",
        "--configPlugin",
        "swc3",
    });
    rollup_cmd.step.dependOn(&tsx_cmd.step);

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

fn build_build_all(
    b: *std.Build,
    step: *std.Build.Step,
    cleanup_step: *std.Build.Step,
    build_server_step: *std.Build.Step,
    cleanup_client_step: *std.Build.Step,
) void {
    _ = b; // autofix
    step.dependOn(cleanup_step);
    step.dependOn(build_server_step);
    step.dependOn(cleanup_client_step);
}

fn build_dev_client(b: *std.Build, step: *std.Build.Step) void {
    const echo_cmd = b.addSystemCommand(&.{ "echo", "Starting client in development mode..." });
    step.dependOn(&echo_cmd.step);

    const vite_dev = b.addSystemCommand(&.{
        "pnpm",
        "exec",
        "vite",
        "src/client",
    });
    vite_dev.step.dependOn(&echo_cmd.step);

    step.dependOn(&vite_dev.step);
}

fn build_test_types(b: *std.Build, step: *std.Build.Step) void {
    const echo_cmd = b.addSystemCommand(&.{ "echo", "Running type tests..." });
    step.dependOn(&echo_cmd.step);

    const tsc_cmd = b.addSystemCommand(&.{
        "sh",
        "-c",
        "pnpm --dir type-check exec tsc && echo '✅ Type check passed' || (echo '❌ Type check failed' && exit 1)",
    });
    tsc_cmd.step.dependOn(&echo_cmd.step);

    step.dependOn(&tsc_cmd.step);
}

fn build_test_all(
    b: *std.Build,
    step: *std.Build.Step,
    test_types_step: *std.Build.Step,
) void {
    step.dependOn(test_types_step);

    const echo_cmd = b.addSystemCommand(&.{ "echo", "Running tests..." });
    echo_cmd.step.dependOn(test_types_step);

    const vitest_cmd = b.addSystemCommand(&.{
        "pnpm",
        "exec",
        "vitest",
        "--coverage",
    });
    vitest_cmd.step.dependOn(&echo_cmd.step);

    step.dependOn(&vitest_cmd.step);
}

fn build_lint(b: *std.Build, step: *std.Build.Step) void {
    const echo_cmd = b.addSystemCommand(&.{ "echo", "Linting code..." });
    step.dependOn(&echo_cmd.step);

    const eslint_cmd = b.addSystemCommand(&.{
        "pnpm",
        "exec",
        "eslint",
        ".",
        "--fix",
    });
    eslint_cmd.step.dependOn(&echo_cmd.step);

    step.dependOn(&eslint_cmd.step);
}

fn build_format(b: *std.Build, step: *std.Build.Step) void {
    const echo_cmd = b.addSystemCommand(&.{ "echo", "Formatting code..." });
    step.dependOn(&echo_cmd.step);

    const dprint_cmd = b.addSystemCommand(&.{
        "pnpm",
        "exec",
        "dprint",
        "fmt",
    });
    dprint_cmd.step.dependOn(&echo_cmd.step);

    step.dependOn(&dprint_cmd.step);
}

fn build_publish(
    b: *std.Build,
    step: *std.Build.Step,
    build_all_step: *std.Build.Step,
) void {
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
