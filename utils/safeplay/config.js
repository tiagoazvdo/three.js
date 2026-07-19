import { createHash } from 'node:crypto';
import { readFile } from 'node:fs/promises';
import { resolve } from 'node:path';

export const distributionDirectory = resolve( 'safeplay-dist/r185' );
export const manifestName = 'manifest.json';
export const shippedFiles = [ 'LICENSE.txt', 'three.core.min.js', 'three.module.min.js' ];
export const upstreamCommit = '2431a09f46f34c560bc8e44b33be0e567723d5b9';
export const upstreamRelease = 'r185';
export const upstreamRepository = 'https://github.com/mrdoob/three.js';
export const sourceRepository = 'https://github.com/tiagoazvdo/three.js';

export function sha256( bytes ) {

	return createHash( 'sha256' ).update( bytes ).digest( 'hex' );

}

export async function fileRecord( name ) {

	const bytes = await readFile( resolve( distributionDirectory, name ) );

	return {
		name,
		sha256: sha256( bytes ),
		bytes: bytes.byteLength
	};

}

export async function readPackage( path ) {

	return JSON.parse( await readFile( resolve( path ), 'utf8' ) );

}
