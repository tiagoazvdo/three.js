import { execFileSync } from 'node:child_process';
import { copyFile, mkdir, rm, writeFile } from 'node:fs/promises';
import { resolve } from 'node:path';
import { rollup } from 'rollup';
import buildFactory from '../build/rollup.config.js';
import { REVISION } from '../../src/constants.js';
import {
	distributionDirectory,
	fileRecord,
	manifestName,
	shippedFiles,
	sourceRepository,
	upstreamCommit,
	upstreamRelease,
	upstreamRepository,
	readPackage
} from './config.js';

const rootPackage = await readPackage( 'package.json' );
const rollupPackage = await readPackage( 'node_modules/rollup/package.json' );
const terserPluginPackage = await readPackage( 'node_modules/@rollup/plugin-terser/package.json' );
const terserPackage = await readPackage( 'node_modules/terser/package.json' );

const git = ( ...args ) => execFileSync( 'git', args, { encoding: 'utf8' } ).trim();
const sourceCommit = git( 'rev-parse', 'HEAD' );
const dirty = git( 'status', '--porcelain', '--untracked-files=all' ) !== '';
const npmVersion = process.env.npm_config_user_agent?.match( /(?:^| )npm\/([^ ]+)/ )?.[ 1 ] ?? 'unknown';

if ( git( 'rev-parse', `${ upstreamRelease }^{commit}` ) !== upstreamCommit ) {

	throw new Error( `${ upstreamRelease } does not resolve to the audited upstream commit.` );

}

await rm( distributionDirectory, { recursive: true, force: true } );
await mkdir( distributionDirectory, { recursive: true } );

const upstreamBuild = buildFactory( {} ).find( ( entry ) =>
	Object.keys( entry.input ).includes( 'three.module.min.js' )
);

if ( upstreamBuild === undefined ) {

	throw new Error( 'Could not locate the upstream minified WebGL ESM build.' );

}

const { output, ...inputOptions } = upstreamBuild;
const bundle = await rollup( {
	...inputOptions,
	input: {
		'three.core.min.js': inputOptions.input[ 'three.core.min.js' ],
		'three.module.min.js': inputOptions.input[ 'three.module.min.js' ]
	}
} );

try {

	await bundle.write( {
		...output[ 0 ],
		dir: distributionDirectory,
		sourcemap: false
	} );

} finally {

	await bundle.close();

}

await copyFile( resolve( 'LICENSE' ), resolve( distributionDirectory, 'LICENSE.txt' ) );

const files = [];

for ( const name of shippedFiles ) files.push( await fileRecord( name ) );

const manifest = {
	schemaVersion: 1,
	distribution: 'safeplay-three-webgl-esm',
	source: {
		repository: sourceRepository,
		commit: sourceCommit,
		dirty
	},
	upstream: {
		repository: upstreamRepository,
		release: upstreamRelease,
		commit: upstreamCommit
	},
	three: {
		packageVersion: rootPackage.version,
		revision: REVISION
	},
	tools: {
		node: process.version,
		npm: npmVersion,
		rollup: rollupPackage.version,
		rollupPluginTerser: terserPluginPackage.version,
		terser: terserPackage.version
	},
	files
};

await writeFile(
	resolve( distributionDirectory, manifestName ),
	`${ JSON.stringify( manifest, null, 2 ) }\n`,
	'utf8'
);

console.log( `Built ${ manifest.distribution } ${ manifest.three.packageVersion } (${ sourceCommit }).` );
console.log( `${ files.length } files written to ${ distributionDirectory } (dirty: ${ dirty }).` );
