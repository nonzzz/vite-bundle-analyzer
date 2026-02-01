const std = @import("std");

const BuildSteps = struct {
    unit_test: *std.Build.Step,
    wasm: *std.Build.Step,
    wasm_javascript_bindings: *std.Build.Step,
};

pub fn build(b: *std.Build) void {
    const target = b.standardTargetOptions(.{});
    const optimize = b.standardOptimizeOption(.{});
    const build_steps = BuildSteps{
        .unit_test = b.step("unit_test", "Run zig part unit test case"),
        .wasm = b.step("wasm", "Build wasm artifacts"),
        .wasm_javascript_bindings = b.step("wasm_javascript_bindings", "Build wasm javascript bindings"),
    };

    build_unit_test(b, build_steps.unit_test, target, optimize);

    _ = build_wasm_lib(b, build_steps.wasm);

    build_wasm_javascript_bindings(b, build_steps.wasm_javascript_bindings);
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
    // pnpm exec rollup -c ./zig/javascript/rollup.config.ts --configPlugin swc3
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
