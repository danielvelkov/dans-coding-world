import {
  addProjectConfiguration,
  formatFiles,
  generateFiles,
  joinPathFragments,
  names,
  offsetFromRoot,
  Tree,
} from '@nx/devkit';
import * as path from 'path';
import { SveltelibGeneratorSchema } from './schema';

export async function sveltelibGenerator(
  tree: Tree,
  options: SveltelibGeneratorSchema,
) {
  const normalized = names(options.name);

  const projectDirectory = options.directory
    ? `${options.directory}/${normalized.fileName}`
    : normalized.fileName;

  const projectRoot = joinPathFragments('libs', projectDirectory);

  addProjectConfiguration(tree, normalized.fileName, {
    root: projectRoot,
    projectType: 'library',
    sourceRoot: `${projectRoot}/src`,
    targets: {},
  });

  // Dynamic cacheDir for Vite
  const cacheDir = joinPathFragments(
    'node_modules/.vite',
    projectDirectory.replace(/\//g, '-'),
  );

  // Basically the ../../.. path route for the tsconfig.base.json or other related files
  const relativeToRoot = offsetFromRoot(projectRoot);

  generateFiles(tree, path.join(__dirname, 'files'), projectRoot, {
    ...options,
    ...normalized,
    projectRoot,
    cacheDir,
    relativeToRoot,
  });

  await formatFiles(tree);
}

export default sveltelibGenerator;
