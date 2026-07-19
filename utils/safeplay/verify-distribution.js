import { execFileSync } from 'node:child_process';
import { readdir, readFile } from 'node:fs/promises';
import { pathToFileURL } from 'node:url';
import { resolve } from 'node:path';
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

const fail = ( message ) => {

	throw new Error( `SafePlay distribution verification failed: ${ message }` );

};

const rootPackage = await readPackage( 'package.json' );
const rollupPackage = await readPackage( 'node_modules/rollup/package.json' );
const terserPluginPackage = await readPackage( 'node_modules/@rollup/plugin-terser/package.json' );
const terserPackage = await readPackage( 'node_modules/terser/package.json' );
const manifest = JSON.parse(
	await readFile( resolve( distributionDirectory, manifestName ), 'utf8' )
);
const currentCommit = execFileSync( 'git', [ 'rev-parse', 'HEAD' ], { encoding: 'utf8' } ).trim();

if ( manifest.schemaVersion !== 1 ) fail( 'unsupported manifest schema.' );
if ( manifest.distribution !== 'safeplay-three-webgl-esm' ) fail( 'unexpected distribution name.' );
if ( manifest.source?.repository !== sourceRepository ) fail( 'unexpected source repository.' );
if ( manifest.source?.commit !== currentCommit ) fail( 'artifact does not match HEAD.' );
if ( manifest.source?.dirty !== false ) fail( 'release was built from a dirty tree.' );
if ( manifest.upstream?.repository !== upstreamRepository ) fail( 'unexpected upstream repository.' );
if ( manifest.upstream?.release !== upstreamRelease ) fail( 'unexpected upstream release.' );
if ( manifest.upstream?.commit !== upstreamCommit ) fail( 'unexpected upstream commit.' );
if ( manifest.three?.packageVersion !== rootPackage.version ) fail( 'package version mismatch.' );
if ( manifest.three?.revision !== REVISION ) fail( 'Three.js revision mismatch.' );
if ( manifest.tools?.rollup !== rollupPackage.version ) fail( 'Rollup version mismatch.' );
if ( manifest.tools?.rollupPluginTerser !== terserPluginPackage.version ) fail( 'Rollup Terser plugin version mismatch.' );
if ( manifest.tools?.terser !== terserPackage.version ) fail( 'Terser version mismatch.' );

const names = manifest.files?.map( ( file ) => file.name );
const directoryNames = ( await readdir( distributionDirectory ) ).sort();
const expectedDirectoryNames = [ manifestName, ...shippedFiles ].sort();

if ( JSON.stringify( names ) !== JSON.stringify( shippedFiles ) ) {

	fail( 'shipped file set or order does not match the contract.' );

}

if ( JSON.stringify( directoryNames ) !== JSON.stringify( expectedDirectoryNames ) ) {

	fail( 'distribution directory contains missing or unexpected files.' );

}

for ( let index = 0; index < shippedFiles.length; index ++ ) {

	const actual = await fileRecord( shippedFiles[ index ] );
	const expected = manifest.files[ index ];

	if ( actual.sha256 !== expected.sha256 || actual.bytes !== expected.bytes ) {

		fail( `${ actual.name } hash or byte length mismatch.` );

	}

}

const moduleUrl = pathToFileURL(
	resolve( distributionDirectory, 'three.module.min.js' )
).href;
const distributionModule = await import( `${ moduleUrl }?verify=${ currentCommit }` );

if ( distributionModule.REVISION !== REVISION ) fail( 'runtime module revision mismatch.' );
if ( typeof distributionModule.WebGLRenderer !== 'function' ) fail( 'WebGLRenderer export is missing.' );

console.log( `Verified ${ manifest.distribution } at ${ currentCommit }.` );
console.log( manifest.files.map( ( file ) => `${ file.name } ${ file.sha256 } ${ file.bytes } bytes` ).join( '\n' ) );
