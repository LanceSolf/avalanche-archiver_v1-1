/**
 * SlopeLayer - Raster-based Slope Visualization
 * 
 * Uses a custom protocol 'slope://' to generate slope tiles on the CPU.
 * This allows MapLibre to natively drape the slope layer over the 3D terrain,
 * eliminating z-fighting and floating mesh issues.
 */

// Register the custom protocol once
let protocolRegistered = false;

function registerSlopeProtocol() {
    if (protocolRegistered) return;

    maplibregl.addProtocol('slope', async (params, abortController) => {
        // Parse "slope://z/x/y"
        const chunks = params.url.split('slope://')[1].split('/');
        const z = parseInt(chunks[0]);
        const x = parseInt(chunks[1]);
        const y = parseInt(chunks[2]);

        // Fetch the source Terrarium tile
        const terrariumUrl = `https://s3.amazonaws.com/elevation-tiles-prod/terrarium/${z}/${x}/${y}.png`;

        try {
            const response = await fetch(terrariumUrl, { signal: abortController.signal });
            if (!response.ok) throw new Error('Tile load failed');

            const blob = await response.blob();
            const imageBitmap = await createImageBitmap(blob);

            // Process on Canvas
            // Use OffscreenCanvas if available for worker-like performance on main thread (or actual worker later)
            const canvas = new OffscreenCanvas(256, 256);
            const ctx = canvas.getContext('2d', { willReadFrequently: true });
            ctx.drawImage(imageBitmap, 0, 0);

            const imgData = ctx.getImageData(0, 0, 256, 256);
            const data = imgData.data; // RGBA array
            const outputData = new Uint8ClampedArray(data.length);

            // Slope Calculation Constants
            // C ~ 40075km
            const C = 40075016.686;

            // Calculate meters based on tile center latitude
            // Approximate latitude for the whole tile to save perf
            const n = Math.pow(2, z);
            const latRad = Math.atan(Math.sinh(Math.PI * (1 - 2 * (y + 0.5) / n)));
            const metersPerPixel = (C * Math.cos(latRad)) / Math.pow(2, z) / 256.0;

            // Helper to get elevation
            // Terrarium: (R * 256 + G + B / 256) - 32768
            const getEle = (i) => {
                return (data[i] * 256.0 + data[i + 1] + data[i + 2] / 256.0) - 32768.0;
            };

            for (let r = 0; r < 256; r++) {
                for (let c = 0; c < 256; c++) {
                    const i = (r * 256 + c) * 4;

                    // Simple finite difference
                    // We clamp edges to current pixel (slope 0 at edge) 
                    // Ideally we'd fetch neighbors but that's too heavy for this demo.

                    const e0 = getEle(i);

                    // Right neighbor
                    let e_dx;
                    if (c < 255) {
                        e_dx = getEle(i + 4);
                    } else {
                        e_dx = e0; // Edge case
                    }

                    // Bottom neighbor
                    let e_dy;
                    if (r < 255) {
                        e_dy = getEle(i + 256 * 4);
                    } else {
                        e_dy = e0; // Edge case
                    }

                    const dzdx = (e_dx - e0) / metersPerPixel;
                    const dzdy = (e_dy - e0) / metersPerPixel;

                    const slopeRad = Math.atan(Math.sqrt(dzdx * dzdx + dzdy * dzdy));
                    const slope = slopeRad * 180 / Math.PI;

                    // Colorize
                    // Red: 30-45, Yellow: 25-30?
                    // Match previous shader:
                    // 45+ Black/Indigo
                    // 40+ Dark Red
                    // 35+ Red
                    // 30+ Orange
                    // 25+ Yellow

                    let R = 0, G = 0, B = 0, A = 0;

                    if (slope >= 45.0) { R = 26; G = 0; B = 51; A = 204; } // #1a0033cc
                    else if (slope >= 40.0) { R = 153; G = 0; B = 0; A = 204; } // #990000cc
                    else if (slope >= 35.0) { R = 255; G = 0; B = 0; A = 204; } // #ff0000cc
                    else if (slope >= 30.0) { R = 255; G = 128; B = 0; A = 204; } // #ff8000cc
                    else if (slope >= 27.0) { R = 255; G = 255; B = 0; A = 204; } // #ffff00cc (adjusted to 27 to match typical avi maps)
                    else { R = 0; G = 0; B = 0; A = 0; }

                    outputData[i] = R;
                    outputData[i + 1] = G;
                    outputData[i + 2] = B;
                    outputData[i + 3] = A;
                }
            }

            // Put data back and retrieve image
            const outImgData = new ImageData(outputData, 256, 256);
            ctx.putImageData(outImgData, 0, 0);

            const outBlob = await canvas.convertToBlob({ type: 'image/png' });
            return { data: await outBlob.arrayBuffer() };

        } catch (e) {
            console.error('Slope protocol error', e);
            throw e;
        }
    });

    protocolRegistered = true;
}

class SlopeLayer {
    constructor() {
        this.id = 'slope-layer';
        this.sourceId = 'slope-source';
        this._visible = false;
        this.opacity = 0.7;

        registerSlopeProtocol();
    }

    onAdd(map) {
        this.map = map;

        // Add Source
        if (!map.getSource(this.sourceId)) {
            map.addSource(this.sourceId, {
                type: 'raster',
                tiles: ['slope://{z}/{x}/{y}'],
                tileSize: 256,
                minzoom: 0,
                maxzoom: 15, // Terrarium limit
                attribution: 'Slope calculated from Mapzen Terrarium'
            });
        }

        // Add Layer
        if (!map.getLayer(this.id)) {
            map.addLayer({
                id: this.id,
                type: 'raster',
                source: this.sourceId,
                paint: {
                    'raster-opacity': this.opacity,
                    'raster-fade-duration': 0
                },
                layout: {
                    visibility: 'none'
                }
            });
        }
    }

    // Compatibility methods for main.js interaction
    setOpacity(val) {
        this.opacity = val;
        if (this.map && this.map.getLayer(this.id)) {
            this.map.setPaintProperty(this.id, 'raster-opacity', val);
        }
    }

    get visible() {
        return this._visible;
    }

    set visible(val) {
        this._visible = val;
        if (this.map && this.map.getLayer(this.id)) {
            this.map.setLayoutProperty(this.id, 'visibility', val ? 'visible' : 'none');
        }
    }
}
