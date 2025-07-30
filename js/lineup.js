const upload_field = document.querySelector('#file-input');
upload_field.addEventListener('change', read_file);
function read_file() {
    var reader = new FileReader();
    reader.onloadend = function (e) {
        var _a;
        process_file((_a = e.target) === null || _a === void 0 ? void 0 : _a.result);
    };
    if (upload_field.files !== null) {
        reader.readAsBinaryString(upload_field.files[0]);
    }
}
function process_file(e) {
    var workbook = XLSX.read(e, { type: "binary" });
    var sheet = workbook.Sheets["Report"];
    var rows = XLSX.utils.sheet_to_json(sheet);
    //console.log(rows);

    var currentDate = null;

    var show_all_breaks = document.querySelector('#show-all-breaks').checked;
    var no_breaks = document.querySelector('#no-breaks').checked;

    var sort_by_time = document.querySelector('#sort-time').checked;


    const row_template = document.querySelector('#row-template');
    const table_template = document.querySelector('#table-template');
    const holder = document.querySelector('#tables');

    var days = {
    }    

    rows.forEach(element => {   
        if (element.__EMPTY.startsWith("Schedule -")){
            currentDate = element.__EMPTY.split(" - ")[1];
            return;
        }
        if (currentDate==null){
            return;
        }
        days[currentDate] = days[currentDate] || [];
        days[currentDate].push(element);
    });
        Object.keys(days).forEach(day => {
            days[day].sort((a, b) => a.__EMPTY_5 - b.__EMPTY_5);
        });
        console.log(days);

    Object.keys(days).forEach(day => {
        var table = table_template.content.cloneNode(true);
        var table_body = table.querySelector('tbody');
        table.querySelector('#date').innerHTML = day;
        var employeeShifts = {};

        // Group shifts by employee
        days[day].forEach(element => {
            employeeShifts[element.__EMPTY] = employeeShifts[element.__EMPTY] || [];
            employeeShifts[element.__EMPTY].push(element);
        });
        // If theres more than 1 shift for an employee, split the label ("if exists")
        Object.keys(employeeShifts).forEach(_tm =>{
            if (employeeShifts[_tm].length > 1) {
                employeeShifts[_tm].forEach((shift, index) => {
                    if (shift.__EMPTY_3 !== undefined && shift.__EMPTY_3.includes('/')) {
                        shift.__EMPTY_3 = (shift.__EMPTY_3.split('/')[index]).trim();
                    }
                    
                // also add elipses if there is another shift after this one
                    if (index < employeeShifts[_tm].length - 1) {
                        shift.__NEXT_INDICATOR = '(+)';
                    }
                    // if theres one before it, add a before indicator
                    if (index > 0) {
                        shift.__PREVIOUS_INDICATOR = '(+)';
                    }
                });
            }
            
            var start = employeeShifts[_tm][0].__EMPTY_5;
            var end = employeeShifts[_tm][employeeShifts[_tm].length - 1].__EMPTY_6;
            // If the start and end times are the same, set the start time to the first
            
            employeeShifts[_tm].forEach(shift => {
                shift.__IN_TIME = start;
                shift.__OUT_TIME = end;
            });
            
        });

        var newday = [];
        Object.keys(employeeShifts).forEach(employee => {
            newday.push(...employeeShifts[employee]);
        });
        
        // Sort the shifts by job title
        newday.sort((a, b) => {
            if (a.__EMPTY_4 < b.__EMPTY_4) return -1;
            if (a.__EMPTY_4 > b.__EMPTY_4) return 1;
            return 0;
        });


        var breaktimes = [];

        if (sort_by_time) {
            // Sort the shifts by start time
            newday.sort((a, b) => a.__EMPTY_5 - b.__EMPTY_5);
        }
        newday.forEach(element => {

            var row = row_template.content.cloneNode(true);
            row.querySelector('#employee').innerHTML = element.__EMPTY;
            row.querySelector('#label').innerHTML = element.__EMPTY_3 ? element.__EMPTY_3 : "";
            row.querySelector('#job').innerHTML = element.__EMPTY_4 ? element.__EMPTY_4 : "";
            row.querySelector('#start').innerHTML = (element.__PREVIOUS_INDICATOR ? element.__PREVIOUS_INDICATOR: "")+excelDateToJSDate(element.__EMPTY_5).toLocaleTimeString([], { hour: 'numeric', minute: '2-digit' });
            row.querySelector('#end').innerHTML = excelDateToJSDate(element.__EMPTY_6).toLocaleTimeString([], { hour: 'numeric', minute: '2-digit' }) + (element.__NEXT_INDICATOR ? element.__NEXT_INDICATOR: "");
            row.querySelector('#length').innerHTML = element.__EMPTY_10 ? element.__EMPTY_10 : "";
        
            // if the job is "Courtesy Clerk", "Regular Cashier", "Express Cashier", "Easy Scan Cashier", "Liquor TM", "Runner", do breaks   
            if ( !no_breaks && (element.__EMPTY_4 === "Courtesy Clerk" || element.__EMPTY_4 === "Regular Cashier" || element.__EMPTY_4 === "Express Cashier" || element.__EMPTY_4 === "Easy Scan Cashier" || element.__EMPTY_4 === "Liquor TM" || element.__EMPTY_4 === "Runner" || show_all_breaks)) {


                if (element.__EMPTY_10 <= 6) {
                    // If the shift is 6 hours or less, break is half way between start and end
                    var start = excelDateToJSDate(element.__IN_TIME);
                    var end = excelDateToJSDate(element.__OUT_TIME);
                    var breakTime = new Date(start.getTime() + (end.getTime() - start.getTime()) / 2);
                    // round it to the nearest 15 minutes
                    breakTime.setMinutes(Math.round(breakTime.getMinutes() / 15) * 15);

                    // check if the breaktime is already in the breaktimes array, if it is, keep moving it back 15 minutes until it isn't
                    while (breaktimes.some(bt => bt.getTime() === breakTime.getTime())) {
                        breakTime.setMinutes(breakTime.getMinutes() + 15);
                    }
                    // otherwise add it to the breaktimes array
                    breaktimes.push(breakTime);

                    console.log(breaktimes);
                    row.querySelector('#break').innerHTML = breakTime.toLocaleTimeString([], { hour: 'numeric', minute: '2-digit' });

                    // however if the breaktime isn't during this shift segment, set it to '-'
                    if (breakTime.getTime() < excelDateToJSDate(element.__EMPTY_5).getTime() || breakTime.getTime()
                        > excelDateToJSDate(element.__EMPTY_6).getTime()) {
                        row.querySelector('#break').innerHTML = '-';
                    }
                }

                if (element.__EMPTY_10 > 6 && element.__EMPTY_10 <= 8) {
                    // If the shift is between 6 and 8 hours, first break is a third of the way through, lunch is 2/3 of the way through
                    var start = excelDateToJSDate(element.__IN_TIME);
                    var end = excelDateToJSDate(element.__OUT_TIME);
                    var firstBreakTime = new Date(start.getTime() + (end.getTime() - start.getTime()) / 3);
                    var lunchBreakTime = new Date(start.getTime() + (end.getTime() - start.getTime()) * 2 / 3);
                    // round it to the nearest 15 minutes
                    firstBreakTime.setMinutes(Math.round(firstBreakTime.getMinutes() / 15) * 15);
                    lunchBreakTime.setMinutes(Math.round(lunchBreakTime.getMinutes() / 15) * 15);

                    // check if the breaktime is already in the breaktimes array, if it is, keep moving it back 15 minutes until it isn't
                    while (breaktimes.some(bt => bt.getTime() === firstBreakTime.getTime())) {
                        firstBreakTime.setMinutes(firstBreakTime.getMinutes() + 15);
                    }
                    // otherwise add it to the breaktimes array
                    breaktimes.push(firstBreakTime);

                    while (breaktimes.some(bt => bt.getTime() === lunchBreakTime.getTime())) {
                        lunchBreakTime.setMinutes(lunchBreakTime.getMinutes() + 15);
                    }
                    breaktimes.push(lunchBreakTime);

                    row.querySelector('#break').innerHTML = firstBreakTime.toLocaleTimeString([], { hour: 'numeric', minute: '2-digit' });
                    row.querySelector('#lunch').innerHTML = lunchBreakTime.toLocaleTimeString([], { hour: 'numeric', minute: '2-digit' });

                    // however if the breaktime isn't during this shift segment, set it to '-'
                    if (firstBreakTime.getTime() < excelDateToJSDate(element.__EMPTY_5).getTime() || firstBreakTime.getTime()
                        > excelDateToJSDate(element.__EMPTY_6).getTime()) {
                        row.querySelector('#break').innerHTML = '-';
                    }
                    if (lunchBreakTime.getTime() < excelDateToJSDate(element.__EMPTY_5).getTime() || lunchBreakTime.getTime()
                        > excelDateToJSDate(element.__EMPTY_6).getTime()) {
                        row.querySelector('#lunch').innerHTML = '-';
                    }

                }
                if (element.__EMPTY_10 > 8) {
                    // finally, if the shift is more than 8 hours, first break is a quarter of the way through, lunch is half way through, second break is 3/4 of the way through
                    var start = excelDateToJSDate(element.__IN_TIME);
                    var end = excelDateToJSDate(element.__OUT_TIME);
                    var firstBreakTime = new Date(start.getTime() + (end.getTime() - start.getTime()) / 4);
                    var lunchBreakTime = new Date(start.getTime() + (end.getTime() - start.getTime()) / 2);
                    var secondBreakTime = new Date(start.getTime() + (end.getTime() - start.getTime()) * 3 / 4);
                    // round it to the nearest 15 minutes   
                    firstBreakTime.setMinutes(Math.round(firstBreakTime.getMinutes() / 15) * 15);
                    lunchBreakTime.setMinutes(Math.round(lunchBreakTime.getMinutes() / 15) * 15);
                    secondBreakTime.setMinutes(Math.round(secondBreakTime.getMinutes() / 15) * 15);
                    // check if the breaktime is already in the breaktimes array, if it is, keep moving it back 15 minutes until it isn't
                    while (breaktimes.some(bt => bt.getTime() === firstBreakTime.getTime())) {
                        firstBreakTime.setMinutes(firstBreakTime.getMinutes() + 15);
                    }
                    // otherwise add it to the breaktimes array
                    breaktimes.push(firstBreakTime);

                    while (breaktimes.some(bt => bt.getTime() === lunchBreakTime.getTime())) {
                        lunchBreakTime.setMinutes(lunchBreakTime.getMinutes() + 15);
                    }
                    breaktimes.push(lunchBreakTime);
                    while (breaktimes.some(bt => bt.getTime() === secondBreakTime.getTime())) {
                        secondBreakTime.setMinutes(secondBreakTime.getMinutes() + 15);
                    }
                    breaktimes.push(secondBreakTime);
                    row.querySelector('#break').innerHTML = firstBreakTime.toLocaleTimeString([], { hour: 'numeric', minute: '2-digit' });
                    row.querySelector('#lunch').innerHTML = lunchBreakTime.toLocaleTimeString([], { hour: 'numeric', minute: '2-digit' });
                    row.querySelector('#break2').innerHTML = secondBreakTime.toLocaleTimeString([], { hour: 'numeric', minute: '2-digit' });
                                                // however if the breaktime isn't during this shift segment, set it to '-'
                    if (firstBreakTime.getTime() < excelDateToJSDate(element.__EMPTY_5).getTime() || firstBreakTime.getTime()
                        > excelDateToJSDate(element.__EMPTY_6).getTime()) {
                        row.querySelector('#break').innerHTML = '-';
                    }
                    if (lunchBreakTime.getTime() < excelDateToJSDate(element.__EMPTY_5).getTime() || lunchBreakTime.getTime()
                        > excelDateToJSDate(element.__EMPTY_6).getTime()) {
                        row.querySelector('#lunch').innerHTML = '-';
                    }
                    if (secondBreakTime.getTime() < excelDateToJSDate(element.__EMPTY_5).getTime() || secondBreakTime.getTime()
                        > excelDateToJSDate(element.__EMPTY_6).getTime()) {
                        row.querySelector('#break2').innerHTML = '-';
                    }
                }
            }

            else{
                row.querySelector('#break').innerHTML = 'B';
                row.querySelector('#break').style.textAlign = 'left';
                row.querySelector('#lunch').innerHTML = element.__EMPTY_10 > 6 ? 'L' : '';
                row.querySelector('#lunch').style.textAlign = 'left';
                row.querySelector('#break2').innerHTML = element.__EMPTY_10 > 8 ? 'B': '';
                row.querySelector('#break2').style.textAlign = 'left';
            }
            table_body.appendChild(row);
        });
        holder.appendChild(table);
        console.log(employeeShifts);
    });

}

function excelDateToJSDate(excelDate) {
    return new Date(Math.round((excelDate - 25569) * 86400 * 1000) + 4 * 60 * 60 * 1000);
}