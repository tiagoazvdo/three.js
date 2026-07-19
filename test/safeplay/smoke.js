import { createReadStream } from 'node:fs';
import { stat } from 'node:fs/promises';
import { createServer } from 'node:http';
import { extname, resolve, sep } from 'node:path';
import puppeteer from 'puppeteer';

const root = resolve( '.' );
const contentTypes = new Map( [
	[ '.html', 'text/html; charset=utf-8' ],
	[ '.js', 'text/javascript; charset=utf-8' ],
	[ '.json', 'application/json; charset=utf-8' ]
] );

const server = createServer( async ( request, response ) => {

	try {

		const pathname = decodeURIComponent( new URL( request.url, 'http://localhost' ).pathname );
		const path = resolve( root, `.${ pathname }` );

		if ( path !== root && ! path.startsWith( `${ root }${ sep }` ) ) {

			response.writeHead( 403 ).end();
			return;

		}

		const metadata = await stat( path );

		if ( ! metadata.isFile() ) throw new Error( 'not a file' );

		response.writeHead( 200, {
			'Content-Type': contentTypes.get( extname( path ) ) ?? 'application/octet-stream',
			'Content-Length': metadata.size,
			'Cache-Control': 'no-store'
		} );
		createReadStream( path ).pipe( response );

	} catch ( error ) {

		response.writeHead( 404 ).end();

	}

} );

await new Promise( ( resolveListen ) => server.listen( 0, '127.0.0.1', resolveListen ) );

let browser;

try {

	browser = await puppeteer.launch( {
		headless: true,
		args: [
			'--no-sandbox',
			'--disable-setuid-sandbox',
			'--enable-webgl',
			'--ignore-gpu-blocklist',
			'--enable-unsafe-swiftshader'
		]
	} );

	const page = await browser.newPage();
	const errors = [];
	page.on( 'pageerror', ( error ) => errors.push( error.message ) );
	page.on( 'console', ( message ) => {

		if ( message.type() === 'error' ) errors.push( message.text() );

	} );

	const address = server.address();
	await page.goto( `http://127.0.0.1:${ address.port }/test/safeplay/index.html`, {
		waitUntil: 'networkidle0'
	} );
	const result = await page.evaluate( () => globalThis.__SAFEPLAY_RESULT__ );

	if ( errors.length > 0 ) throw new Error( `Browser errors: ${ errors.join( '; ' ) }` );
	if ( result?.ok !== true ) throw new Error( `Worker smoke failed: ${ JSON.stringify( result ) }` );

	console.log( `Worker OffscreenCanvas smoke passed: ${ JSON.stringify( result ) }` );

} finally {

	await browser?.close();
	await new Promise( ( resolveClose, rejectClose ) => server.close( ( error ) =>
		error ? rejectClose( error ) : resolveClose()
	) );

}
