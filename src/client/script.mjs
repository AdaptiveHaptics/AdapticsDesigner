/** @typedef {import("../shared/types").MidAirHapticsAnimationFileFormat} MidAirHapticsAnimationFileFormat */
/** @type {{filename: string, filedata: MidAirHapticsAnimationFileFormat }} */
const current_design = {
    filename: "",
    filedata: {
        revision: "0.0.1-alpha.1",
        name: "test",
        
        direction: "normal",
        duration: 5*1000,
        iteration_count: 1,

        projection: "plane",
        update_rate: 1,
        
        keyframes: [
            {
                time: 0.000,
                coords: {
                    x: 0,
                    y: 0,
                    z: 0,
                },
                intensity: {
                    name: "Constant",
                    params: {
                        value: 0.75000
                    }
                },
                brush: {
                    name: "Point",
                    params: {
                        size: 1
                    }
                },
                transition: {
                    name: "Linear",
                    params: {}
                }
            }
        ]
    }
};