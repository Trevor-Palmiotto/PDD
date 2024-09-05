import { OrbitControls } from './OrbitControls.js'
import { TrackballControls } from './TrackballControls.js'

export { CameraController }

class CameraController {
    constructor(camera, domElement) {
        this._camera     = camera;
        this._domElement = domElement;
        this._orbit      = new OrbitControls( this._camera, this._domElement );
        this._zoom       = new TrackballControls( this._camera, this._domElement );
        this._InitializeOrbit();
        this._InitializeZoom();
    }
    _InitializeOrbit() {
        this._orbit.enableDamping = true;
        this._orbit.dampingFactor = 0.15;
        this._orbit.enableZoom    = false;
    };
    _InitializeZoom() {
        this._zoom.noRotate  = true;
        this._zoom.noPan     = true;
        this._zoom.zoomSpeed = 0.8;
    };
    Enable() {
        this._orbit.enabled = true;
        this._zoom.enabled  = true;
    };
    Disable() {
        this._orbit.enabled = false;
        this._zoom.enabled  = false;
    };
    Update() {
        const target = this._orbit.target
        this._zoom.target.set( target.x, target.y, target.z )
        this._orbit.update();
        this._zoom.update();
    };
};