
var fs = require('fs');     
var jf = require('jsonfile')
var util = require('util') 


var input_file  = 'users.json'
var output_file = 'teaser/connected_users.json'
var seeds, start_id, end_id, empty_string = ' ', dataset_size = 8;

function puts(error, stdout, stderr) { sys.puts(stdout) }


function populate_empty_dataset() {
	
	
	
	var obj = JSON.parse(fs.readFileSync(input_file, 'utf8'));
	seeds = generate_seed();

	for (var i = seeds[0], j=0; ( ( i <= seeds[1] ) && ( ( i - seeds[0] + 1) <= dataset_size ) ); i++) {
		if ( (( i+1) <= seeds[1] ) && ( ( (i + 1) - seeds[0] + 1) <= dataset_size ) ){
			if ( i === seeds[0] ) {
				fs.writeFile(output_file, '[ \n' + JSON.stringify(obj[i]) + ',\n', function(err) {
					err != null? console.log(err) : console.log('Object: ' + obj[j].id + ' inserted successfully!');
				})
			} else {
				fs.appendFile(output_file, JSON.stringify(obj[i]) + ',\n', function(err) {
					err != null? console.log(err) : console.log('Object: ' + obj[j].id + ' inserted successfully!');
				})
			}
		} else {
			fs.appendFile(output_file, JSON.stringify(obj[i]) + '\n]', function(err) {
				err != null? console.log(err) : console.log('Object: ' + obj[j].id + ' inserted successfully!');
			})

		}
		j++;
	}
	

	return true;	
}
function generate_seed() {
	var start = Math.floor(Math.random() * (500 - 1 + 1) + 1);
	var end   = Math.floor(Math.random() * (1000 - 500 + 1) + 500);
	return [ start, end ];

}

function pop_from_dataset(id) {
	
  var obj, obj_after_pop = [];
  try {

	obj = JSON.parse(fs.readFileSync(output_file, 'utf8'));

	console.log('before remove of ' + id);
	for (i=0; i < obj.length; i++) {
		console.log(obj[i].id);
	}

	for ( i=0; i < obj.length; i++) {
		if (obj[i].id == id) {
		   delete obj[i];
		   break;
		}
	}

	console.log('after remove of ' + id);
	for (i=0; i < obj.length; i++) {
		if (obj[i] != undefined) {
			obj_after_pop.push(obj[i]);
			console.log(obj[i].id);
		}
	}

	fs.writeFile(output_file, JSON.stringify(obj_after_pop), function(err) {
		err != null? console.log(err) : console.log('Object inserted successfully after 1 pop!');
	});

	return true;

  } catch (err) {
		console.log(output_file + " not yet ready: " + err);
		return false;
  }

}

function push_to_dataset(id){

	var input  = JSON.parse(fs.readFileSync(input_file, 'utf8'));
	var output = JSON.parse(fs.readFileSync(output_file, 'utf8'));
	
	console.log('before adding of ' + id);
	for ( i=0; i < output.length; i++) {
		console.log(output[i].id);
	}

	
	for ( i=0; i < input.length; i++) {
		if (input[i].id == id) {
			output.push(input[i]);
			break;
		}
	}
	
	console.log('after adding of ' + id);
	for (i=0; i < output.length; i++) {
		console.log(output[i].id);
	}
	
	console.log('This is how the json object looks like:');
	console.log(output);
	
	fs.writeFile(output_file, JSON.stringify(output), function(err) {
			err != null? console.log(err) : console.log('Object inserted successfully!');
		});

}

function update_connected_users () {
	
	if( populate_empty_dataset()) {
		var output
		setInterval(function () {
			output = JSON.parse(fs.readFileSync(output_file, 'utf8'));
			random_element_to_remove = output[Math.floor(Math.random() * output.length)].id;
			if ( pop_from_dataset(random_element_to_remove ) ) {
				setTimeout( function () {
					push_seeds = generate_seed(); 
					push_to_dataset(push_seeds[0]);
				}, 3000);
			}	
		}, 8000 );
	
	}
}

update_connected_users();
