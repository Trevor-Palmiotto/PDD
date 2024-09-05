import { LoadingManager, Vector3 } from "./three.js";

export class ObjectPDD {

    constructor( graphDict, coordinateDict, componentDict ) {
        
        this.graph            = graphDict;
        this.coordinates      = coordinateDict;
        this.components       = componentDict;
        this.n                = Object.keys( this.graph ).length;
        this.dt               = 0.002;
        this.frictionHalfLife = 0.004;
        this.frictionFactor   = Math.pow(0.5, this.dt/this.frictionHalfLife);
        
        this.forces           = new Array( this.n ).fill( new Vector3(0., 0., 0.) );
        this.velocities       = new Array( this.n ).fill( new Vector3(0., 0., 0.) );
        
        this.distances        = this.computeDistances();
        this.angles           = this.computeAngles();
        this.dihedrals        = this.computeDihedrals();

        this.distMaxScalar = 0;
        this.anglMaxScalar = 0;
        this.diheMaxScalar = 0;
        // console.log(this.distances);
        // console.log(this.angles);
        // console.log(this.dihedrals);
    }

    getNeighbors = ( node ) => {
        if ( !(node in this.graph) ) return [];
        return this.graph[ node ][ 'neighbors' ]; // list of neighbors
    }

    computeDistances = () => {
        //  A---B
        let distances = {}
        for (const A in this.graph) {
            if ( this.graph.hasOwnProperty( A ) ) {  // might be redundant
                let p1 = this.coordinates[ A ];
                let Bs = this.getNeighbors( A );
                for ( const B of Bs ) {
                    if ( this.graph.hasOwnProperty( B ) ) {  // might be redundant
                        let distanceKey = [ Number(A), Number(B) ].sort();
                        if ( !(distances.hasOwnProperty( distanceKey )) ) {  // might be redundant
                            let distanceConstants    = distanceKey.map( v => { return this.components[this.graph[ v ][ 'component' ]][this.graph[ v ][ 'type' ]][ 'distanceConstant' ] } );
                            distances[ distanceKey ] = { distance: p1.distanceTo( this.coordinates[ Number(B) ] ), constant: Math.max(...distanceConstants) };
                        }
                    }
                }
            }
        }
        return distances;
    };

    angle = (a, b, c) => {
        // a   c
        //  \ /
        //   b
        let v1         = new Vector3().subVectors(a, b);
        let v2         = new Vector3().subVectors(c, b);
        let dotProduct = v1.clone().dot(v2);
        if (dotProduct/( v1.length()*v2.length()) == 1) {return Math.PI}
        return Math.acos( dotProduct/( v1.length()*v2.length() )); // (-1, 1)
    };
    computeAngles = () => {
        // A   C
        //  \ /
        //   B
        let angles = {}
        for (const A in this.graph) {
            if ( this.graph.hasOwnProperty( Number(A) ) ) {  // might be redundant
                const Bs = this.getNeighbors( Number(A) );
                for ( const B of Bs ) {
                    if ( this.graph.hasOwnProperty( Number(B) ) ) {  // might be redundant
                        const Cs = this.getNeighbors( Number(B) );
                        for ( const C of Cs ) {
                            if ( this.graph.hasOwnProperty( Number(C) ) && Number(A) != Number(C) ) { // might be redundant
                                const angleKey = [ Math.min( Number(A), Number(C) ), Number(B), Math.max( Number(A), Number(C) ) ];
                                if ( !(angles.hasOwnProperty( angleKey )) ) {
                                    const angleConstants = angleKey.map( v => { return this.components[this.graph[ v ][ 'component' ]][this.graph[ v ][ 'type' ]][ 'angleConstant' ] });
                                    angles[angleKey]     = { angle: this.angle(...angleKey.map( v => { return this.coordinates[v] } )), constant: Math.max(...angleConstants) };
                                }
                            }
                        }
                    }
                }
            }
        }
        return angles;
    };

    dihedral = (a, b, c, d) => {
        // a
        //  \
        //   b---c
        //        \
        //         d
        let v1 = new Vector3().subVectors( a, b );
        let v2 = new Vector3().subVectors( c, b );
        let v3 = new Vector3().subVectors( d, c );
        let vy = v2.clone().cross( v1 );
        let vx = vy.clone().cross( v2 );
        if (vy.length() < 0.0001) return -1;
        if (vx.length() < 0.0001) return -1;
        vy.normalize();
        vx.normalize();
        let cy = v3.clone().dot( vy );
        let cx = v3.clone().dot( vx );
        return Math.atan2(cy, cx);
    };
    computeDihedrals = () => {
        // A
        //  \
        //   B---C
        //        \
        //         D
        let dihedrals = {};
        for (const A in this.graph) {
            if ( this.graph.hasOwnProperty( Number(A) ) ) {  // might be redundant
                const Bs = this.getNeighbors( Number(A) );
                for ( const B of Bs ) {
                    if ( this.graph.hasOwnProperty( Number(B) ) ) {  // might be redundant
                        const Cs = this.getNeighbors( Number(B) );
                        for ( const C of Cs ) {
                            if ( this.graph.hasOwnProperty( Number(C) ) && Number(A) !== Number(C) ) { // might be redundant
                                const Ds = this.getNeighbors( Number(C) );
                                for ( const D of Ds ) {
                                    if ( this.graph.hasOwnProperty( Number(D) ) && Number(A) !== Number(D) && Number(B) !== Number(D) ) { // might be redundant
                                        const dihedralKey = [ ( (Number(B) < Number(C) ) ? Number(A): Number(D)), Math.min( Number(B), Number(C) ), Math.max( Number(B), Number(C) ), (( Number(C) < Number(B) ) ? Number(A): Number(D) )];
                                        if ( !(dihedrals.hasOwnProperty(dihedralKey)) ) {
                                            const dihedralConstants = dihedralKey.map( v => { return this.components[this.graph[ v ][ 'component' ]][this.graph[ v ][ 'type' ]][ 'dihedralConstant' ] });
                                            dihedrals[dihedralKey] = { dihedral: this.dihedral(...dihedralKey.map( v => { return this.coordinates[ v ] } )), constant: Math.max(...dihedralConstants) };
                                        }
                                    }
                                }
                            }
                        }
                    }
                }
            }
        }
        return dihedrals;
    };

    // -------- TEMPORAL RESOLUTION -------- //
    distanceForces = () => {
        // A---B
        for (const pair in this.distances) {
            let parsedPair = pair.split(',').map( v => { return Number(v) } );
            let distance   = this.coordinates[parsedPair[0]].distanceTo(this.coordinates[parsedPair[1]]);
            let direction  = new Vector3().subVectors(this.coordinates[parsedPair[0]], this.coordinates[parsedPair[1]]); direction.normalize();
            let scalar     = this.distances[pair]['constant']*((distance >= this.distances[pair]['distance']) ? 1: -1)*(distance - this.distances[pair]['distance'])**2;
            if (Math.abs(scalar) > this.distMaxScalar) this.distMaxScalar = Math.abs(scalar);
            let fA     = direction.clone().multiplyScalar(-scalar);
            let fB     = direction.clone().multiplyScalar(scalar);
            this.forces[parsedPair[0]] = new Vector3().addVectors(this.forces[parsedPair[0]], fA);
            this.forces[parsedPair[1]] = new Vector3().addVectors(this.forces[parsedPair[1]], fB);
        }
    }


    angleGradient = (a, b, c) => {
        // a   c
        //  \ /
        //   b
        let v1       = new Vector3().subVectors(a, b);
        let v2       = new Vector3().subVectors(c, b)
        let v1_x_v2  = v1.clone().cross( v2 );
        let v2_x_v1  = v2.clone().cross( v1 );
        let v1_v2_v1 = v1_x_v2.clone().cross( v1 ); v1_v2_v1.divideScalar( -Math.max( 1, v1_v2_v1.length() ) );
        let v2_v1_v2 = v2_x_v1.clone().cross( v2 ); v2_v1_v2.divideScalar( -Math.max( 1, v2_v1_v2.length() ) );
        return [ v1_v2_v1, v1_v2_v1.clone().add( v2_v1_v2 ).multiplyScalar( -(v1_v2_v1.clone().add( v2_v1_v2 ).length()) ), v2_v1_v2 ];
    };

    angleForces = () => {
        // a   c
        //  \ /
        //   b
        for (const trio in this.angles) {
            let parsedTrio = trio.split( ',' ).map( v => { return Number(v) } );
            let theta = this.angle(...parsedTrio.map( v => { return this.coordinates[v] } ));
            let [ fA, fB, fC ] = this.angleGradient( ...parsedTrio.map( v => { return this.coordinates[v] } ) );
            // let scalar = this.angles[ trio ][ 'constant' ] * ( theta - this.angles[ trio ][ 'angle' ] )**2; // no negative angles
            let scalar = ( ( theta >= this.angles[ trio ][ 'angle' ] ) ? -1: 1 ) * this.angles[ trio ][ 'constant' ] * ( theta - this.angles[ trio ][ 'angle' ] )**2;
            this.forces[ parsedTrio[ 0 ] ] = new Vector3().addVectors( this.forces[ parsedTrio[ 0 ] ], fA.multiplyScalar( scalar ) )
            this.forces[ parsedTrio[ 1 ] ] = new Vector3().addVectors( this.forces[ parsedTrio[ 1 ] ], fB.multiplyScalar( scalar ) )
            this.forces[ parsedTrio[ 2 ] ] = new Vector3().addVectors( this.forces[ parsedTrio[ 2 ] ], fC.multiplyScalar( scalar ) )
        }
    };

    dihedralGradient = (a, b, c, d, phi) => {
        // a
        //  \
        //   b---c
        //        \
        //         d
        let v1 = new Vector3().subVectors(a, b);
        let v2 = new Vector3().subVectors(c, b);
        let v3 = new Vector3().subVectors(d, c);
        let v2_x_v1 = v2.clone().cross( v1 ); v2_x_v1.normalize();
        let v2_x_v3 = v2.clone().cross( v3 ); v2_x_v3.normalize().multiplyScalar(-1);
        if (phi === -1) {
            let v2_x_v1_v1 = v2_x_v1.clone().cross(v1);
            let v2_x_v3_v3 = v2_x_v3.clone().cross(v3);
            if (Math.abs(v1.length()*v3.length()) - Math.abs(v1.clone().dot(v3)) <= 0.01) return [ new Vector3(), new Vector3(), new Vector3(), new Vector3()];
            v2_x_v1_v1.normalize();
            v2_x_v3_v3.normalize();
            return [ v2_x_v1_v1, v2_x_v1_v1.clone().multiplyScalar(-1), v2_x_v3_v3.clone().multiplyScalar(-1), v2_x_v3_v3 ];
        }
        return [ v2_x_v1, v2_x_v1.clone().add( v2_x_v3 ).divideScalar( -2 ), v2_x_v1.clone().add( v2_x_v3 ).divideScalar( -2 ), v2_x_v3 ];
    };

    dihedralForces = () => {
        // A
        //  \
        //   B---C
        //        \
        //         D
        for (const quad in this.dihedrals) {
            let parsedQuad = quad.split( ',' ).map( v => { return Number(v) } );
            let phi = this.dihedral(...parsedQuad.map( v => { return this.coordinates[v] } ));
            let [ fA, fB, fC, fD ] = this.dihedralGradient( ...parsedQuad.map( v => { return this.coordinates[v] } ), this.dihedrals[ quad ][ 'dihedral' ]);
            // let scalar = this.dihedrals[ quad ][ 'constant' ] * Math.sin( phi - this.dihedrals[ quad ][ 'dihedral' ] ); // dU ???
            // let scalar = ((phi >= this.dihedrals[ quad ][ 'dihedral' ]) ? 1 : -1) * this.dihedrals[ quad ][ 'constant' ] * (phi - this.dihedrals[ quad ][ 'dihedral' ] )**2;
            let scalar = this.dihedrals[ quad ][ 'constant' ] * Math.sin( phi - this.dihedrals[ quad ][ 'dihedral' ] );
            if (this.dihedrals[ quad ][ 'dihedral' ] === -1) { scalar = this.dihedrals[ quad ][ 'constant' ] }; // need a way to invert the scalar depending on direction ?? 
            this.forces[ parsedQuad[ 0 ] ] = new Vector3().addVectors( this.forces[ parsedQuad[ 0 ] ], fA.multiplyScalar( scalar ) );
            this.forces[ parsedQuad[ 1 ] ] = new Vector3().addVectors( this.forces[ parsedQuad[ 1 ] ], fB.multiplyScalar( scalar ) );
            this.forces[ parsedQuad[ 2 ] ] = new Vector3().addVectors( this.forces[ parsedQuad[ 2 ] ], fC.multiplyScalar( scalar ) );
            this.forces[ parsedQuad[ 3 ] ] = new Vector3().addVectors( this.forces[ parsedQuad[ 3 ] ], fD.multiplyScalar( scalar ) );
        }
    };
    verlet = () => {
        // Clear forces array and calculate forces:
        this.forces.fill( new Vector3(0., 0., 0.) );
        this.distanceForces();
        this.angleForces();

        this.dihedralForces(); // normal dihedral is broken -- rotation is inconsistent towards optimal phi - indirect approach occasionally
        // Do unit tests with the line object, random generation of coordinates after force parameterization. Do stepwise conformation
        // Confirm that improper is fine too
        
        // Update Velocities
        for (const i in this.graph) {
            this.velocities[Number(i)] = new Vector3().addVectors(this.velocities[Number(i)].multiplyScalar(this.frictionFactor), this.forces[Number(i)].multiplyScalar(this.dt));
        }
        for (const i in this.graph) {
            // x += v*dt
            this.coordinates[Number(i)].add(this.velocities[Number(i)].clone().multiplyScalar(this.dt));
            // x += 0.5*a*dt^2 (miniscule)
            this.coordinates[Number(i)].add(this.forces[Number(i)].multiplyScalar(0.5*this.dt**2));
        }
        // this.coordinates[0].add(new Vector3((Math.random()*2-1)*.1, (Math.random()*2-1)*.1, (Math.random()*2-1)*.1));
    };

    // ------------ Interpolation ------------
    // interpolatePoints = (pointSpacing) => {

    //     // return new this.constructor()
    // }
}