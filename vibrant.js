const logger = require('./logger').logger
const Vibrant = require('node-vibrant')

exports.getSwatches = (imgHref, callback) => {
    logger.info('Extracting prominent colors for image ' + imgHref)
    Vibrant.from(imgHref).getPalette((err, palette) => {
        if (err) {
            return callback(err, null)
        }

        const result = {
            darkMuted: palette.DarkMuted.getHex(),
            darkVibrant: palette.DarkVibrant.getHex(),
            lightMuted: palette.LightMuted.getHex(),
            lightVibrant: palette.LightVibrant.getHex(),
            regularMuted: palette.Muted.getHex(),
            regularVibrant: palette.Vibrant.getHex()
        }

        // let dominantSwatch = {
        //     name: null,
        //     swatch: null,
        //     population: 0
        // }

        // for (swatch in p) {
        //     logger.debug(`${swatch}: ${p[swatch].population} : ${p[swatch].getHex()}`)
        //     if (p[swatch] && p[swatch].population > dominantSwatch.population) { 
        //         dominantSwatch.name = swatch
        //         dominantSwatch.population = p[swatch].population
        //         dominantSwatch.swatch = p[swatch]
        //     }
        // }
        

        logger.debug(`${imgHref}: ${JSON.stringify(result, null, '\t')}`) 

        return callback(null, result)
    })
    
}