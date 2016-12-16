const logger = require('./logger').logger
const ColorThief = require('./color-thief')
const vibrant = require('./vibrant')

const tinycolor = require('tinycolor2')
const paper = require('paper')
const convert = require('color-convert')
const DeltaE = require('delta-e')

const canvas = new paper.Canvas(1500, 1500)
paper.setup(canvas)

getBorderRaster = (imgHref, callback) => {
    logger.debug(`Creating a Paper raster containing only borders for ${imgHref}`)

    const raster = new paper.Raster({
        source: imgHref,
        // position: paper.view.center
    })

    raster.onError = () => {
        callback(`Error loading image ${imgHref} in Paper raster`, null)
    }

    raster.onLoad = () => {
        canvas.width = raster.width
        canvas.height = raster.height

        paper.view.viewSize = new paper.Size(raster.width, raster.height)

        raster.fitBounds(paper.view.size)

        raster.visible = false

        let w = 0
        let z = 0
        for (let x = 0; x < raster.width; x++) {
            for (let y = 0; y < raster.height; y ++) {
                if ((x >= 10 && x <= (raster.width - 10))
                    && (y >= 10 && y <= (raster.height - 10))) {
                    
                    // const rect = paper.Path.Rectangle(x, y, 1, 1)
                    // rect.fillColor = new paper.Color(255, 255, 255)                        
                } else {
                    const color = raster.getPixel(x, y)
                    const rect = paper.Path.Rectangle(w, z, 1, 1)
                    rect.fillColor = color

                    if (w == raster.width) {
                        w = 0
                        z ++
                    } else {
                        w ++
                    }
                }
            }
        }

        paper.view.viewSize = new paper.Size(w, z)

        paper.view.update()

        callback(null, raster)
    }
}

filterProminentColors = (res, palette, borderColors, callback) => {
    if (res) {
        callback(`Error getting prominent colors ${res}`)
    }

    // const regularVibrantRgb = tinycolor( palette.regularVibrant ).toRgb()

    for (let swatch in palette) {
        if (palette[swatch]) {
            const pColor = palette[swatch].substring(1)
            const pLabColor = convert.hex.lab(pColor)
            for (let i = 0; i < borderColors.length; i ++) {
                const color = borderColors[i]
                const labColor = convert.hex.lab(color)
                
                const dE = DeltaE.getDeltaE76({L: labColor[0], A: labColor[1], B: labColor[2]}, {L: pLabColor[0], A: pLabColor[1], B: pLabColor[2]})

                // logger.debug(`Delta-E computed between dominant color ${color} and vibrant color ${pColor}: ${dE}`)
                if (dE < 10) {
                    logger.debug(`Delta-E computed between border color ${color} and ${swatch} color ${pColor}: ${dE}`)
                    palette[swatch] = null
                }
            }
        }                                        
    }

    callback(null, palette)
}

exports.getProminentColors = (imgHref, callback) => {
    const colorThief = new ColorThief()

    getBorderRaster(imgHref, (err, raster) => {
        if (err) {
            logger.error(err)
            callback(err, null)
        }

        const borderColors = colorThief.getDominantColors(raster)
        logger.debug(`${imgHref} border dominant colors are: ${borderColors}`)

        raster.project.clear()

        vibrant.getSwatches(imgHref, (err, palette) => {
            return filterProminentColors(err, palette, borderColors, callback)
        })
    })
}