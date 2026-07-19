import { execFileSync } from 'node:child_process';
import { readdir, readFile } from 'node:fs/promises';
import { resolve } from 'node:path';
import { distributionDirectory, sha256 } from './config.js';

const build = () => execFileSync(
	process.execPath,
	[ 'utils/safeplay/build-distribution.js' ],
	{ stdio: 'inherit' }
);

async function snapshot() {

	const names = ( await readdir( distributionDirectory ) ).sort();
	const records = [];

	for ( const name of names ) {

		const bytes = await readFile( resolve( distributionDirectory, name ) );
		records.push( { name, sha256: sha256( bytes ), bytes: bytes.byteLength } );

	}

	return records;

}

build();
const first = await snapshot();
build();
const second = await snapshot();

if ( JSON.stringify( first ) !== JSON.stringify( second ) ) {

	throw new Error( 'SafePlay distribution is not byte-for-byte deterministic.' );

}

console.log( `Determinism verified across two builds (${ second.length } files).` );
