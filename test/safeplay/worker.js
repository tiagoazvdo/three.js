import {
	Mesh,
	NoColorSpace,
	OrthographicCamera,
	PlaneGeometry,
	REVISION,
	Scene,
	ShaderMaterial,
	UnsignedByteType,
	WebGLRenderer,
	WebGLRenderTarget
} from '../../safeplay-dist/r185/three.module.min.js';

self.onmessage = async ( event ) => {

	let renderer;
	let target;
	let geometry;
	let material;

	try {

		const canvas = event.data.canvas;
		renderer = new WebGLRenderer( { canvas, antialias: false } );
		renderer.setPixelRatio( 1 );
		renderer.setSize( 8, 8, false );

		const scene = new Scene();
		const camera = new OrthographicCamera( - 1, 1, 1, - 1, 0.1, 10 );
		camera.position.z = 1;
		geometry = new PlaneGeometry( 2, 2 );
		material = new ShaderMaterial( {
			vertexShader: 'void main(){gl_Position=projectionMatrix*modelViewMatrix*vec4(position,1.0);}',
			fragmentShader: 'void main(){gl_FragColor=vec4(0.125,0.5,0.875,1.0);}'
		} );
		scene.add( new Mesh( geometry, material ) );

		target = new WebGLRenderTarget( 8, 8, { type: UnsignedByteType } );
		target.texture.colorSpace = NoColorSpace;
		renderer.setRenderTarget( target );
		renderer.render( scene, camera );

		const pixel = new Uint8Array( 4 );
		renderer.readRenderTargetPixels( target, 4, 4, 1, 1, pixel );
		renderer.setRenderTarget( null );
		renderer.render( scene, camera );

		const expected = [ 32, 128, 223, 255 ];
		const pixelMatches = expected.every( ( value, index ) => Math.abs( pixel[ index ] - value ) <= 2 );
		const webgpu = { available: typeof navigator !== 'undefined' && navigator.gpu !== undefined };

		if ( webgpu.available ) {

			try {

				webgpu.adapter = Boolean( await navigator.gpu.requestAdapter() );

			} catch ( error ) {

				webgpu.error = String( error );

			}

		}

		self.postMessage( {
			ok: REVISION === '185' && renderer.capabilities.isWebGL2 === true && pixelMatches,
			revision: REVISION,
			pixel: Array.from( pixel ),
			webgl2: renderer.capabilities.isWebGL2,
			webgpu
		} );

	} catch ( error ) {

		self.postMessage( { ok: false, error: error?.stack ?? String( error ) } );

	} finally {

		target?.dispose();
		geometry?.dispose();
		material?.dispose();
		renderer?.dispose();

	}

};
