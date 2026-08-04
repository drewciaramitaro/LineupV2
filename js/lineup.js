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

function generateBreaks(shiftStart, shiftEnd, date, length, shiftUkgLunch) {
    console.log("Generating breaks for shift:", shiftStart, shiftEnd, date, shiftUkgLunch);

    var start = excelDateToJSDate(shiftStart);
    var end = excelDateToJSDate(shiftEnd);
    let ukgLunch = new Date(`${date} ${shiftUkgLunch}`);
    let break1 = null;
    let lunch = null;
    let break2 = null;
    
    if(length <= 6){
        break1 = new Date(start.getTime() + (end.getTime() - start.getTime()) / 2);
        // round it to the nearest 15 minutes
        break1.setMinutes(Math.round(break1.getMinutes() / 15) * 15);       
    }

    else if(length > 6 && length <= 8){
        break1 = new Date(start.getTime() + (end.getTime() - start.getTime()) / 3);
        lunch = new Date(start.getTime() + (end.getTime() - start.getTime()) * 2 / 3);
        break1.setMinutes(Math.round(break1.getMinutes() / 15) * 15);
        lunch.setMinutes(Math.round(lunch.getMinutes() / 15) * 15);
    }

    else if(length > 8){
        break1 = new Date(start.getTime() + (end.getTime() - start.getTime()) / 4);
        lunch = new Date(start.getTime() + (end.getTime() - start.getTime()) / 2);
        break2 = new Date(start.getTime() + (end.getTime() - start.getTime()) * 3 / 4);
        // round it to the nearest 15 minutes   
        break1.setMinutes(Math.round(break1.getMinutes() / 15) * 15);
        lunch.setMinutes(Math.round(lunch.getMinutes() / 15) * 15);
        break2.setMinutes(Math.round(break2.getMinutes() / 15) * 15);
    }

    if(length > 6 && document.querySelector('#use-generated-lunch').checked){
        lunch = ukgLunch;
    }

    return [break1, lunch, break2];

}

function splitOverlappingShifts(shifts) {
    if (!shifts || shifts.length <= 1) {
        return shifts ? shifts.slice() : [];
    }

    const sorted = shifts.slice().sort((a, b) => {
        if (a.__EMPTY_5 !== b.__EMPTY_5) return a.__EMPTY_5 - b.__EMPTY_5;
        return b.__EMPTY_6 - a.__EMPTY_6;
    });

    const boundaries = Array.from(new Set(sorted.flatMap(s => [s.__EMPTY_5, s.__EMPTY_6]))).sort((a, b) => a - b);
    const segments = [];

    for (let i = 0; i < boundaries.length - 1; i++) {
        const segmentStart = boundaries[i];
        const segmentEnd = boundaries[i + 1];
        const active = sorted.filter(s => s.__EMPTY_5 <= segmentStart && s.__EMPTY_6 >= segmentEnd);
        if (!active.length) continue;

        const chosen = active.reduce((best, cur) => {
            if (!best) return cur;
            if (cur.__EMPTY_5 !== best.__EMPTY_5) return cur.__EMPTY_5 > best.__EMPTY_5 ? cur : best;
            const curDur = cur.__EMPTY_6 - cur.__EMPTY_5;
            const bestDur = best.__EMPTY_6 - best.__EMPTY_5;
            return curDur < bestDur ? cur : best;
        }, null);

        const copy = Object.assign({}, chosen);
        copy.__EMPTY_5 = segmentStart;
        copy.__EMPTY_6 = segmentEnd;
        segments.push(copy);
    }

    const merged = [];
    segments.forEach(segment => {
        const prev = merged[merged.length - 1];
        if (prev && prev.__EMPTY_4 === segment.__EMPTY_4 && prev.__EMPTY_3 === segment.__EMPTY_3 && prev.__EMPTY_7 === segment.__EMPTY_7 && prev.__EMPTY_6 === segment.__EMPTY_5) {
            prev.__EMPTY_6 = segment.__EMPTY_6;
            prev.__EMPTY_10 = Math.round((prev.__EMPTY_6 - prev.__EMPTY_5) / 3600000 * 100) / 100;
        } else {
            merged.push(segment);
        }
    });

    return merged;
}

function process_file(e) {
    var workbook = XLSX.read(e, { type: "binary" });
    var sheet = workbook.Sheets["Report"];
    var rows = XLSX.utils.sheet_to_json(sheet);
    //console.log(rows);

    var currentDate = null;

    // settings!
    var show_all_breaks = document.querySelector('#show-all-breaks').checked;
    var no_breaks = document.querySelector('#no-breaks').checked;
    var sort_by_time = document.querySelector('#sort-time').checked;
    var job_filter = document.querySelector('#job-filter').value;
    var sort_express_with_regular = document.querySelector('#express-with-regular').checked;
    var sort_by_group = document.querySelector('#sort-by-group').checked;


    const row_template = document.querySelector('#row-template');
    const table_template = document.querySelector('#table-template');
    const holder = document.querySelector('#tables');

    var days = {
    }

    rows.forEach(element => {
        if (element.__EMPTY.startsWith("Schedule -")) {
            currentDate = element.__EMPTY.split(" - ")[1];
            return;
        }
        if (currentDate == null) {
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
        Object.keys(employeeShifts).forEach(_tm => {
            employeeShifts[_tm].sort((a, b) => a.__EMPTY_5 - b.__EMPTY_5);
            if (employeeShifts[_tm].length > 1) {
                employeeShifts[_tm].forEach((shift, index) => {
                    if (shift.__EMPTY_3 !== undefined && shift.__EMPTY_3.includes('/')) {
                        shift.__EMPTY_3 = (shift.__EMPTY_3.split('/')[index]).trim();
                        if (shift.__EMPTY_4 === "Easy Scan Cashier" && shift.__EMPTY_3 === "Easy Scan") {
                            shift.__EMPTY_3 = "";
                        }

                        if (shift.__EMPTY_4 === "Office Teammate"&& (shift.__EMPTY_3 === "Service Desk" || shift.__EMPTY_3 === "Desk")) {
                            shift.__EMPTY_3 = "";
                        }

                        if (shift.__EMPTY_4 === "Supervisor" && (shift.__EMPTY_3 === "Supervisor" || shift.__EMPTY_3 === "Super")) {
                            shift.__EMPTY_3 = "";
                        }

                        if (shift.__EMPTY_4 === "Cash and Sales" && (shift.__EMPTY_3 === "Cash & Sales" || shift.__EMPTY_3 === "Cash and Sales")) {
                            shift.__EMPTY_3 = "";
                        }


                    }
                });
            }

            employeeShifts[_tm] = splitOverlappingShifts(employeeShifts[_tm]);
            employeeShifts[_tm].forEach((shift, index) => {
                if (index < employeeShifts[_tm].length - 1) {
                    shift.__NEXT_INDICATOR = ' ⇄';
                }
                if (index > 0) {
                    shift.__PREVIOUS_INDICATOR = '⇆ ';
                }
            });

            var start = employeeShifts[_tm][0].__EMPTY_5;
            var end = employeeShifts[_tm][employeeShifts[_tm].length - 1].__EMPTY_6;
            // If the start and end times are the same, set the start time to the first

            // if any of the shifts are "Regular Cashier", "Express Cashier", "Easy Scan Cashier", "Liquor TM", "Runner", "Courtesy Clerk", do breaks

            if (employeeShifts[_tm].some(shift => shift.__EMPTY_4 === "Regular Cashier" || shift.__EMPTY_4 === "Express Cashier" || shift.__EMPTY_4 === "Easy Scan Cashier" || shift.__EMPTY_4 === "Liquor TM" || shift.__EMPTY_4 === "Runner" || shift.__EMPTY_4 === "Courtesy Clerk") || show_all_breaks) {
                let lunch = "";
                employeeShifts[_tm].forEach((shift, i) => {
                    if (shift?.__EMPTY_7) {
                        lunch = shift.__EMPTY_7;
                    }
                });
                var breaks = generateBreaks(start, end, day, employeeShifts[_tm][0].__EMPTY_10, lunch);
            }
            else{
                var breaks = [];
            }

            employeeShifts[_tm].forEach(shift => {
                shift.__IN_TIME = start;
                shift.__OUT_TIME = end;
                if (breaks.length > 0) {
                    shift.__BREAK1 = breaks[0] ? breaks[0] : null;
                    shift.__LUNCH = breaks[1] ? breaks[1] : null;
                    shift.__BREAK2 = breaks[2] ? breaks[2] : null;
                }

            });

        });

        var newday = [];
        Object.keys(employeeShifts).forEach(employee => {
            newday.push(...employeeShifts[employee]);
        });
        newday.sort((a, b) => a.__EMPTY_5 - b.__EMPTY_5);
        // Sort the shifts by job title
        newday.sort((a, b) => {
            if (sort_express_with_regular && !sort_by_group) {
                // if the job is express, sort it with the regualr cashiers
                var job_a = a.__EMPTY_4 === "Express Cashier" ? "Regular Cashier" : a.__EMPTY_4;
                var job_b = b.__EMPTY_4 === "Express Cashier" ? "Regular Cashier" : b.__EMPTY_4;
            }

            else {
                var job_a = a.__EMPTY_4;
                var job_b = b.__EMPTY_4;
            }

            if (job_a < job_b) return -1;
            if (job_a > job_b) return 1;
            return 0;
        });


        const groups = {
            "Supervision & Administration": ["Supervisor", "Co Manager", "CSM"],
            "Office": ["Office Teammate", "Cash and Sales"],
            "Maintenance": ["Housekeeping"],
            "Checkout": ["Regular Cashier", "Express Cashier", "Easy Scan Cashier", "Liquor TM", "Courtesy Clerk"],
            "Instacart": ["Shopper", "Runner"],
            "PAC": ["PAC", "PCC", "PAC Apprentice"],
            "Other": []
        }

        for (const seg in newday) {
            newday[seg].__GROUP = Object.keys(groups).find(group => groups[group].includes(newday[seg].__EMPTY_4)) || "Other";
        }

        var breaktimes = [];

        if (sort_by_time) {
            // Sort the shifts by start time
            newday.sort((a, b) => a.__EMPTY_5 - b.__EMPTY_5);
        }

        if (sort_by_group) {
            newday.sort((a, b) => {
                const groupOrder = ["Supervision & Administration", "Office",  "Maintenance", "Instacart", "Checkout", "PAC", "Other"];

                var job_a = a.__EMPTY_4;
                var job_b = b.__EMPTY_4;

                var group_a = a.__GROUP;
                var group_b = b.__GROUP;

                // if the group is undefined, set it to "Other"
                if (group_a === undefined) group_a = "Other";
                if (group_b === undefined) group_b = "Other";

                const groupIndexA = groupOrder.indexOf(group_a);
                const groupIndexB = groupOrder.indexOf(group_b);
                if (groupIndexA !== groupIndexB) {
                    return groupIndexA - groupIndexB;
                }

                return a.__EMPTY_5 - b.__EMPTY_5;
            });
        }

        var lastGroup = null;

        newday.forEach(element => {

            var row = row_template.content.cloneNode(true);
            row.querySelector('#employee').innerHTML = element.__EMPTY;
            // i'll prefix the label with the store number if someones from aonther store
            // move it to the job instead of the label field
            if(element.__EMPTY_3 && element.__EMPTY_3.startsWith('#')){
                row.querySelector('#job').style.fontSize = '0.8em';
                element.__EMPTY_4 = element.__EMPTY_3.substring(0,5) + '/ ' +element.__EMPTY_4 ;
                element.__EMPTY_3 = element.__EMPTY_3.substring(5);

            }
            row.querySelector('#label').value = element.__EMPTY_3 ? element.__EMPTY_3 : "";
            row.querySelector('#job').innerHTML = element.__EMPTY_4 ? element.__EMPTY_4 : "";
            row.querySelector('#start').innerHTML = (element.__PREVIOUS_INDICATOR ? element.__PREVIOUS_INDICATOR : "") + excelDateToJSDate(element.__EMPTY_5).toLocaleTimeString([], { hour: 'numeric', minute: '2-digit' });
            row.querySelector('#end').innerHTML = excelDateToJSDate(element.__EMPTY_6).toLocaleTimeString([], { hour: 'numeric', minute: '2-digit' }) + (element.__NEXT_INDICATOR ? element.__NEXT_INDICATOR : "");
            row.querySelector('#length').innerHTML = element.__EMPTY_10 ? element.__EMPTY_10 : "";

            // jobs that should NOT push breaks back
            const noPushJobs = [
                "Shopper", "Supervisor", "Office Teammate", "Cash and Sales", "Co Manager", "Housekeeping", "PAC"
            ];
            const shouldPushBreaks = false;//!noPushJobs.includes(element.__EMPTY_4);

            // if the job is "Courtesy Clerk", "Regular Cashier", "Express Cashier", "Easy Scan Cashier", "Liquor TM", "Runner", do breaks   
            if (!no_breaks && (element.__EMPTY_4 === "Courtesy Clerk" || element.__EMPTY_4 === "Regular Cashier" || element.__EMPTY_4 === "Express Cashier" || element.__EMPTY_4 === "Easy Scan Cashier" || element.__EMPTY_4 === "Liquor TM" || show_all_breaks)) {

                let break1 = element.__BREAK1 ? 'B ' + element.__BREAK1.toLocaleTimeString([], { hour: 'numeric', minute: '2-digit' }) : '';
                let lunch = element.__LUNCH ? 'L ' + element.__LUNCH.toLocaleTimeString([], { hour: 'numeric', minute: '2-digit' }) : '';
                let break2 = element.__BREAK2 ? 'B ' + element.__BREAK2.toLocaleTimeString([], { hour: 'numeric', minute: '2-digit' }) : '';
                row.querySelector('#break').value = break1;
                row.querySelector('#lunch').value = lunch;
                row.querySelector('#break2').value = break2;
                // however if the breaktime isn't during this shift segment, set it to '-'
                if ( element.__BREAK1 && (element.__BREAK1.getTime() < excelDateToJSDate(element.__EMPTY_5).getTime() || element.__BREAK1.getTime() > excelDateToJSDate(element.__EMPTY_6).getTime())) {
                    row.querySelector('#break').value = '-';
                }
                if (element.__LUNCH && (element.__LUNCH.getTime() < excelDateToJSDate(element.__EMPTY_5).getTime() || element.__LUNCH.getTime() > excelDateToJSDate(element.__EMPTY_6).getTime())) {
                    row.querySelector('#lunch').value = '-';
                }
                if (element.__BREAK2 && (element.__BREAK2.getTime() < excelDateToJSDate(element.__EMPTY_5).getTime() || element.__BREAK2.getTime() > excelDateToJSDate(element.__EMPTY_6).getTime())) {
                    row.querySelector('#break2').value = '-';
                }
                
            }

            else {
                row.querySelector('#break').value = 'B';
                row.querySelector('#break').style.textAlign = 'left';
                row.querySelector('#lunch').value = element.__EMPTY_10 > 6 ? 'L' : '';
                row.querySelector('#lunch').style.textAlign = 'left';
                row.querySelector('#break2').value = element.__EMPTY_10 > 8 ? 'B' : '';
                row.querySelector('#break2').style.textAlign = 'left';
            }
            if (job_filter && job_filter.length > 0 && !element.__EMPTY_4.toLowerCase().includes(job_filter.toLowerCase())) {
                return; // skip this row if it doesn't match the job filter
            }

            // add a group header if the group has changed
            if (sort_by_group && element.__GROUP !== lastGroup) {
                var groupRow = row_template.content.cloneNode(true);
                groupRow.querySelector('#employee').innerHTML = element.__GROUP;
                groupRow.querySelector('#employee').style.fontWeight = 'bold';
                groupRow.querySelector('#employee').colSpan = '10';
                groupRow.querySelector('#employee').style.textAlign = 'center';
                groupRow.querySelector('#employee').style.backgroundColor = '#000000';
                groupRow.querySelector('#employee').style.color = '#ffffff';
                groupRow.querySelector('#employee').style.printColorAdjust = 'exact';
                groupRow.querySelector('#employee').style.fontSize = '1.2em';

                groupRow.querySelector('#label-c').remove();
                groupRow.querySelector('#job').remove();
                groupRow.querySelector('#start').remove();
                groupRow.querySelector('#end').remove();
                groupRow.querySelector('#break-c').remove();
                groupRow.querySelector('#lunch-c').remove();
                groupRow.querySelector('#break2-c').remove();
                groupRow.querySelector('#length').remove();
                groupRow.querySelector('#notes').remove()
                table_body.appendChild(groupRow);
                lastGroup = element.__GROUP;
            }
            table_body.appendChild(row);
        });
        
        holder.appendChild(table);
        console.log(employeeShifts);
    });

}

function excelDateToJSDate(excelDate) {
    var ms = (excelDate - 25569) * 86400 * 1000;
    var utcDate = new Date(Math.round(ms));
    var localMs = utcDate.getTime() + utcDate.getTimezoneOffset() * 60 * 1000;
    return new Date(Math.round(localMs));
}
const weekMessage = document.querySelector('#week-message')
document.querySelector('#week-message-input').addEventListener('input', function(t) {
        weekMessage.innerHTML = t.target.value;
    });