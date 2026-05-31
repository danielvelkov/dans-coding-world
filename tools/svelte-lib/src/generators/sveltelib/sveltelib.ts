import {
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

  const projectDirectory = options.directory;

  const projectRoot = joinPathFragments('libs', projectDirectory);

  // Basically the ../../.. path route for the tsconfig.base.json or other related files
  const relativeToRoot = offsetFromRoot(projectRoot);

  // Dynamic cacheDir for Vite
  const cacheDir = joinPathFragments(
    relativeToRoot,
    'node_modules/.vite',
    projectDirectory,
  );

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
