// TODO: I won't consider rolldown dts plugin, isolation declaration isn't match for me.
// I have no time to change my code to fit with isolation declaration.
// I'll create a simple dts gen to my current need.
import { Extractor, ExtractorConfig, ExtractorLogLevel } from '@microsoft/api-extractor'
import fs from 'fs'
import { builtinModules } from 'module'
import path from 'path'
import { defineConfig } from 'rolldown'
import type { RolldownPlugin } from 'rolldown'
import { minify } from 'rollup-plugin-swc3'
import ts from 'typescript'
const external = [...builtinModules, 'vite']

export default defineConfig([
  {
    input: {
      cli: 'src/cli.ts',
      index: 'src/server/index.ts'
    },
    external,
    platform: 'node',
    output: [
      { dir: 'dist', format: 'esm', exports: 'named', entryFileNames: '[name].mjs', chunkFileNames: '[name]-[hash].mjs' },
      { dir: 'dist', format: 'cjs', exports: 'named', entryFileNames: '[name].js' }
    ],
    plugins: [
      {
        name: 'resolve-template',
        resolveId: {
          filter: { id: { include: ['html.mjs'] } },
          handler() {
            return { id: './html.mjs', external: true }
          }
        }
      },
      minify({ mangle: true, module: true, compress: true, sourceMap: true }) as RolldownPlugin,
      {
        name: 'dts',
        closeBundle() {
          generateDTS()
          fs.rmSync(path.join(process.cwd(), 'dist/src'), { recursive: true })
        }
      }
    ]
  }
])

function generateDTS() {
  const files: Record<string, string> = {}
  const compilerOptions: ts.CompilerOptions = {
    declaration: true,
    emitDeclarationOnly: true,
    baseUrl: '.',
    moduleResolution: ts.ModuleResolutionKind.Node10,
    target: ts.ScriptTarget.ESNext,
    module: ts.ModuleKind.ESNext,
    jsx: ts.JsxEmit.ReactJSX,
    lib: ['lib.esnext.d.ts', 'lib.dom.d.ts', 'lib.dom.iterable.d.ts'],
    types: ['./global.d.ts', './src/client/global.d.ts'],
    strict: true,
    typeRoots: ['.'],
    esModuleInterop: true,
    skipLibCheck: true
  }
  const host = ts.createCompilerHost(compilerOptions)
  host.writeFile = (fileName, data) => {
    files[fileName] = data
  }
  console.log('Generating dts...')

  const rootFiles = [
    'src/server/index.ts'
  ]
  const program = ts.createProgram(rootFiles, compilerOptions, host)
  const emitResult = program.emit()

  const outputDir = 'dist'

  if (emitResult.emitSkipped) {
    console.error('TypeScript compilation failed')
    return
  }

  fs.mkdirSync(outputDir, { recursive: true })

  for (const filePath in files) {
    const relativePath = path.relative(process.cwd(), filePath)
    const outputPath = path.join(outputDir, relativePath)
    const outputDirname = path.dirname(outputPath)

    fs.mkdirSync(outputDirname, { recursive: true })

    fs.writeFileSync(outputPath, files[filePath])
    console.log(`Generated: ${outputPath}`)
  }

  const config = ExtractorConfig.prepare({
    configObject: {
      mainEntryPointFilePath: path.join(process.cwd(), 'dist/src/server/index.d.ts'),
      bundledPackages: [],
      projectFolder: process.cwd(),
      compiler: {
        tsconfigFilePath: path.join(process.cwd(), 'tsconfig.json')
      },
      apiReport: {
        enabled: false,
        reportFileName: 'api-report.md',
        reportFolder: '<projectFolder>/temp/'
      },
      docModel: {
        enabled: false,
        apiJsonFilePath: '<projectFolder>/temp/api.json'
      },
      dtsRollup: {
        enabled: true,
        untrimmedFilePath: path.join(process.cwd(), 'dist/index.d.ts')
      },
      tsdocMetadata: {
        enabled: false
      },
      messages: {
        extractorMessageReporting: {
          'ae-missing-release-tag': { logLevel: ExtractorLogLevel.None },
          'ae-unresolved-link': { logLevel: ExtractorLogLevel.None }
        }
      }
    },
    packageJsonFullPath: path.join(process.cwd(), 'package.json'),
    configObjectFullPath: undefined
  })

  const extractorResult = Extractor.invoke(config, {
    localBuild: true,
    showVerboseMessages: true
  })

  if (extractorResult.succeeded) {
    const dtsPath = path.join(process.cwd(), 'dist/index.d.ts')
    const dmtsPath = path.join(process.cwd(), 'dist/index.d.mts')
    const globalDTS = fs.readFileSync('./global.d.ts', 'utf8').replace(
      /declare module ['"]html\.mjs['"] \{[\s\S]*?export function html.*?\n\}/g,
      ''
    )
    if (fs.existsSync(dtsPath)) {
      fs.copyFileSync(dtsPath, dmtsPath)
      // then copy global.d.ts into
      for (const file of [dtsPath, dmtsPath]) {
        const c = fs.readFileSync(file, 'utf-8')
        fs.writeFileSync(file, globalDTS + '\n\n' + c)
      }
      console.log('Generated bundled declaration files successfully')
    }
  } else {
    console.error(
      `API Extractor completed with ${extractorResult.errorCount} errors and ${extractorResult.warningCount} warnings`
    )
  }
}
