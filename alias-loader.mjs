import { fileURLToPath, pathToFileURL } from 'node:url'
import path from 'node:path'
import fs from 'node:fs'

const projectRoot = path.resolve(fileURLToPath(new URL('.', import.meta.url)))
const srcDir = path.join(projectRoot, 'src')

export async function resolve(specifier, context, nextResolve) {
  if (specifier.startsWith('@/')) {
    let targetPath = path.join(srcDir, specifier.slice(2))
    if (!path.extname(targetPath)) {
      if (fs.existsSync(`${targetPath}.js`)) {
        targetPath = `${targetPath}.js`
      } else if (fs.existsSync(`${targetPath}.jsx`)) {
        targetPath = `${targetPath}.jsx`
      } else if (fs.existsSync(path.join(targetPath, 'index.js'))) {
        targetPath = path.join(targetPath, 'index.js')
      }
    }

    const absolute = pathToFileURL(targetPath).href
    return nextResolve(absolute, context, nextResolve)
  }

  const isRelative = specifier.startsWith('./') || specifier.startsWith('../')
  const hasExtension = path.extname(specifier) !== ''

  if (isRelative && !hasExtension && context.parentURL) {
    const parentPath = fileURLToPath(context.parentURL)
    const candidatePath = path.resolve(path.dirname(parentPath), `${specifier}.js`)
    if (fs.existsSync(candidatePath)) {
      const candidateUrl = pathToFileURL(candidatePath).href
      return nextResolve(candidateUrl, context, nextResolve)
    }
  }

  return nextResolve(specifier, context, nextResolve)
}

export async function load(url, context, nextLoad) {
  return nextLoad(url, context, nextLoad)
}
