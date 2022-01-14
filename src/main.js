/*
 * Copyright © 2020. TIBCO Software Inc.
 * This file is subject to the license terms contained
 * in the license file that is distributed with this file.
 */

//@ts-check - Get type warnings from the TypeScript language server. Remove if not wanted.

/**
 * Get access to the Spotfire Mod API by providing a callback to the initialize method.
 * @param {Spotfire.Mod} mod - mod api
 */
Spotfire.initialize(async (mod) => {
    /**
     * Create the read function.
     */
    const reader = mod.createReader(
        mod.visualization.data(),
        mod.windowSize(),
        mod.property("myProperty")
    );

    /**
     * Store the context.
     */
    const context = mod.getRenderContext();

    /** Get document properties */
    let providerStreamsLink = (await mod.document.property('ProviderStreamsLink')).value()
    providerStreamsLink = String(providerStreamsLink).replace("{$}", "");

    //----------------------------------------------------

    let rows = null;
    let data = [];

    /**
     * Initiate the read loop
     */
    reader.subscribe(render);

    /**
     * @param {Spotfire.DataView} dataView
     * param {Spotfire.Size} windowSize
     * param {Spotfire.ModProperty<string>} prop
     */
    async function render(dataView, windowSize) {
        /**
         * Check the data view for errors
         */
        let errors = await dataView.getErrors();
        if (errors.length > 0) {
            // Showing an error overlay will hide the mod iframe.
            // Clear the mod content here to avoid flickering effect of
            // an old configuration when next valid data view is received.
            mod.controls.errorOverlay.show(errors);
            return;
        }
        mod.controls.errorOverlay.hide();

        rows = await dataView.allRows();

        //-------------------------------------------------------
        // VIZ FUNCTIONS

        // Convert data rows into objects 
        let processRows = function () {
            if (rows == null) return;

            data = [];

            // Iterate over rows and push into arrays
            rows.forEach(function (row) {
                data.push(row.categorical("col1").formattedValue());
            });
        }

        // Process rows to objects
        processRows();

        //* Separate data, convert to object and sort by hierarchy of job function
        // Reset arrays
        var countRow = 0
        let dataSplit = []
        let dataObj = []

        data.forEach(element => {
            dataSplit[countRow] = element.split('»')
            countRow++
        });

        dataSplit.forEach(element => {
            dataObj.push(Object.assign({}, element))
        });

        function sortBy(ar) {
            return ar.sort((a, b) => a[8] === b[8] ?
                a[5].toString().localeCompare(b[5]) :
                a[8].toString().localeCompare(b[8]));
        }

        let dataOrder = sortBy(dataObj)

        //* Get the highest hierarchy values and separate them into two arrays and sort the second array by the next hierarchy level
        // Reset arrays
        let compA = []
        let dataMaxElement = []
        let dataOtherElement = []
        let dataFullElement = []

        dataOrder.forEach(element => {
            var doctor = ""

            for (let i = 0; i < 5; i++) {
                doctor = doctor.concat(element[i])
            }

            if (!compA.includes(doctor)) {
                dataMaxElement.push(element)
                compA.push(doctor)
            }
            else {
                dataOtherElement.push(element)
            }
        });

        dataMaxElement.forEach(element => {
            var doctor = ""

            for (let i = 0; i < 5; i++) {
                doctor = doctor.concat(element[i])
            }

            dataFullElement.push(element)

            dataOtherElement.forEach(element2 => {
                var doctor2 = ""

                for (let i = 0; i < 5; i++) {
                    doctor2 = doctor2.concat(element2[i])
                }
                if (doctor == doctor2) {
                    dataFullElement.push(element2)
                }
            });
        });

        let dataA = []
        let dataB = []
        dataFullElement.forEach(element => {
            var medData1 = ""
            for (let i = 0; i < 5; i++) {
                i < 4 ? medData1 = medData1.concat(element[i] + "»") : medData1 = medData1.concat(element[i])
            }
            dataA.push(medData1)
        });


        dataFullElement.forEach(element => {
            var medData2 = ""
            for (let i = 5; i < 8; i++) {
                i < 7 ? medData2 = medData2.concat(element[i] + "»") : medData2 = medData2.concat(element[i])
            }
            dataB.push(medData2)
        });


        function tableGenerator(d) {

            let table = document.getElementById("customTable")
            table.innerHTML = ''

            var newThead = document.createElement("thead")
            var newTbody = document.createElement("tbody")

            //HEADERS
            let headers = ["NPI", "First Name", "Middle Name", "Last Name", "Certification", "Job Function", "Email", "Location Phone"]
            var tr = document.createElement("tr")

            for (let i = 0; i < headers.length; i++) {
                var th = document.createElement("th")
                th.append(headers[i])
                tr.appendChild(th)
                newThead.appendChild(tr)
            }
            // * CONFIGURE THE DATA KEY FOR REPEATED RECORDS

            // --- We find unique values of categories
            var uniqueElement = []
            var row = 0

            dataA.forEach(element => {

                let auxData = element.split("»")
                let auxData2 = dataB[row].split("»")
                let newBodyTr = document.createElement("tr")
                var cantRep = 0

                for (var i = 0; i < dataA.length; i++) {
                    element == dataA[i] ? cantRep++ : cantRep
                }

                if (!uniqueElement.includes(element)) {

                    uniqueElement.push(element)

                    let newTd = document.createElement("td")

                    // ** To add links, uncomment this code
                        //let newA = document.createElement("a")
                        //newA.setAttribute('class', 'links')
                        //newA.setAttribute('target', '_blank')

                        //newA.setAttribute('href', `${providerStreamsLink+auxData[4]}`)
                        //newA.append(document.createTextNode(auxData[4]))
                        //newTd.appendChild(newA)

                    newTd.setAttribute('rowSpan', `${cantRep}`)
                    newTd.setAttribute('class', 'oContact')

                    newTd.append(document.createTextNode(auxData[4]))
                    newBodyTr.appendChild(newTd)

                    for (var i = 0; i < auxData.length - 1; i++) {
                        let newTd = document.createElement("td")
                        newTd.append(document.createTextNode(auxData[i]))

                        newTd.setAttribute('rowSpan', `${cantRep}`)
                        newTd.setAttribute('class', 'oContact')

                        newBodyTr.appendChild(newTd)
                    }

                    for (var i = 0; i < auxData2.length; i++) {
                        let newTd2 = document.createElement("td")

                        if (i == 1) {
                            let newA = document.createElement("a")
                            newA.setAttribute('class', 'links')
                            newA.setAttribute('href', `mailto: ${auxData2[i]}`)
                            newA.append(document.createTextNode(auxData2[i]))
                            newTd2.appendChild(newA)
                        }
                        else if (i == 2) {
                            let newA = document.createElement("a")
                            newA.setAttribute('class', 'links')
                            newA.setAttribute('href', `tel: ${auxData2[i]}`)
                            newA.append(document.createTextNode(auxData2[i]))
                            newTd2.appendChild(newA)
                        }
                        else {
                            newTd2.append(document.createTextNode(auxData2[i]))
                        }

                        newTd2.setAttribute('class', 'oContact')
                        newBodyTr.appendChild(newTd2)
                    }
                }

                else {
                    for (var i = 0; i < auxData2.length; i++) {
                        let newTd2 = document.createElement("td")
                        let newA = document.createElement("a")

                        newTd2.setAttribute('class', 'oContact')
                        newTd2.append(document.createTextNode(auxData2[i]))
                        newBodyTr.appendChild(newTd2)
                    }
                }

                row = row + 1
                newTbody.appendChild(newBodyTr)
            });
            table.appendChild(newThead)
            table.appendChild(newTbody)
        }

        tableGenerator(dataA)
        
        // --- line for fixed headers and columns
        // @ts-ignore
        $("#customTable").tableHeadFixer({ 'left': 0, 'head': true });
        // ---

        /**
         * Signal that the mod is ready for export.
         */
        context.signalRenderComplete();
    }
});