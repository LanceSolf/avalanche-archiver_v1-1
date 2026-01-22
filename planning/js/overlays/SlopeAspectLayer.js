/**
 * SlopeAspectLayer - Aspect-based Slope Visualization
 * 
 * Highlights only terrain with slopes ≥20° and colors by aspect direction.
 * Uses a custom protocol 'slope-aspect://' to generate tiles on the CPU.
 * This allows MapLibre to natively drape the layer over 3D terrain.
 */

// Register the custom protocol once
let aspectProtocolRegistered = false;

function registerSlopeAspectProtocol() {
    if (aspectProtocolRegistered) return;

    maplibregl.addProtocol('slope-aspect', async (params, abortController) => {
        // Parse "slope-aspect://z/x/y"
        const chunks = params.url.split('slope-aspect://')[1].split('/');
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
            const canvas = new OffscreenCanvas(256, 256);
            const ctx = canvas.getContext('2d', { willReadFrequently: true });
            ctx.drawImage(imageBitmap, 0, 0);

            const imgData = ctx.getImageData(0, 0, 256, 256);
            const data = imgData.data; // RGBA array
            const outputData = new Uint8ClampedArray(data.length);

            // Slope Calculation Constants
            const C = 40075016.686; // Earth circumference in meters

            // Calculate meters per pixel based on tile center latitude
            const n = Math.pow(2, z);
            const latRad = Math.atan(Math.sinh(Math.PI * (1 - 2 * (y + 0.5) / n)));
            const metersPerPixel = (C * Math.cos(latRad)) / Math.pow(2, z) / 256.0;

            // Helper to get elevation from Terrarium encoding
            // Terrarium: (R * 256 + G + B / 256) - 32768
            const getEle = (i) => {
                return (data[i] * 256.0 + data[i + 1] + data[i + 2] / 256.0) - 32768.0;
            };

            // Aspect color palette (8 directions)
            // Using clear, distinct colors for each cardinal/intercardinal direction
            const aspectColors = {
                N: { R: 59, G: 130, B: 246, A: 204 }, // Blue - cold north
                NE: { R: 34, G: 211, B: 238, A: 204 }, // Cyan - transitional
                E: { R: 34, G: 197, B: 94, A: 204 }, // Green - morning sun
                SE: { R: 163, G: 230, B: 53, A: 204 }, // Yellow-green - warm morning
                S: { R: 239, G: 68, B: 68, A: 204 }, // Red - warmest, most sun
                SW: { R: 251, G: 146, B: 60, A: 204 }, // Orange - afternoon sun
                W: { R: 250, G: 204, B: 21, A: 204 }, // Yellow - evening sun
                NW: { R: 168, G: 85, B: 247, A: 204 }  // Purple - transitional
            };

            // Process each pixel
            for (let r = 0; r < 256; r++) {
                for (let c = 0; c < 256; c++) {
                    const i = (r * 256 + c) * 4;

                    const e0 = getEle(i);

                    // Get neighboring elevations for gradient calculation
                    // Right neighbor (dx)
                    let e_dx;
                    if (c < 255) {
                        e_dx = getEle(i + 4);
                    } else {
                        e_dx = e0; // Edge case
                    }

                    // Bottom neighbor (dy)
                    let e_dy;
                    if (r < 255) {
                        e_dy = getEle(i + 256 * 4);
                    } else {
                        e_dy = e0; // Edge case
                    }

                    // Calculate gradients
                    const dzdx = (e_dx - e0) / metersPerPixel;
                    const dzdy = (e_dy - e0) / metersPerPixel;

                    // Calculate slope angle
                    const slopeRad = Math.atan(Math.sqrt(dzdx * dzdx + dzdy * dzdy));
                    const slope = slopeRad * 180 / Math.PI;

                    // Only process pixels with slope >= 20°
                    if (slope >= 20.0) {
                        // Calculate aspect (direction of steepest descent)
                        // atan2(dzdy, dzdx) gives aspect in radians
                        // Convert to degrees: 0° = East, 90° = North, 180° = West, 270° = South
                        let aspectRad = Math.atan2(dzdy, dzdx);
                        let aspectDeg = aspectRad * 180 / Math.PI;

                        // Convert to compass bearing (0° = North, 90° = East, etc.)
                        // Geographic aspect is perpendicular to gradient direction
                        aspectDeg = 90 - aspectDeg;

                        // Normalize to 0-360 range
                        if (aspectDeg < 0) aspectDeg += 360;
                        if (aspectDeg >= 360) aspectDeg -= 360;

                        // Determine aspect category (8 directions)
                        let color;
                        if (aspectDeg >= 337.5 || aspectDeg < 22.5) {
                            color = aspectColors.N;
                        } else if (aspectDeg >= 22.5 && aspectDeg < 67.5) {
                            color = aspectColors.NE;
                        } else if (aspectDeg >= 67.5 && aspectDeg < 112.5) {
                            color = aspectColors.E;
                        } else if (aspectDeg >= 112.5 && aspectDeg < 157.5) {
                            color = aspectColors.SE;
                        } else if (aspectDeg >= 157.5 && aspectDeg < 202.5) {
                            color = aspectColors.S;
                        } else if (aspectDeg >= 202.5 && aspectDeg < 247.5) {
                            color = aspectColors.SW;
                        } else if (aspectDeg >= 247.5 && aspectDeg < 292.5) {
                            color = aspectColors.W;
                        } else { // 292.5 - 337.5
                            color = aspectColors.NW;
                        }

                        outputData[i] = color.R;
                        outputData[i + 1] = color.G;
                        outputData[i + 2] = color.B;
                        outputData[i + 3] = color.A;
                    } else {
                        // Slope < 20°: transparent
                        outputData[i] = 0;
                        outputData[i + 1] = 0;
                        outputData[i + 2] = 0;
                        outputData[i + 3] = 0;
                    }
                }
            }

            // Put data back and retrieve image
            const outImgData = new ImageData(outputData, 256, 256);
            ctx.putImageData(outImgData, 0, 0);

            const outBlob = await canvas.convertToBlob({ type: 'image/png' });
            return { data: await outBlob.arrayBuffer() };

        } catch (e) {
            console.error('Slope-aspect protocol error', e);
            throw e;
        }
    });

    aspectProtocolRegistered = true;
}

class SlopeAspectLayer {
    constructor() {
        this.id = 'slope-aspect-layer';
        this.sourceId = 'slope-aspect-source';
        this._visible = false;
        this.opacity = 0.7;

        registerSlopeAspectProtocol();
    }

    onAdd(map) {
        this.map = map;

        // Add Source
        if (!map.getSource(this.sourceId)) {
            map.addSource(this.sourceId, {
                type: 'raster',
                tiles: ['slope-aspect://{z}/{x}/{y}'],
                tileSize: 256,
                minzoom: 0,
                maxzoom: 15, // Terrarium limit
                attribution: 'Slope-aspect calculated from Mapzen Terrarium'
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
