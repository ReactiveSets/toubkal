   

### HISTORY

* 2014-09-03:
  * Displaying a reactive table which DOM container id is sales_table, ordered by date, for the year 2014, from a source sales dataflow coming from a socket.io server, pulling the minimum amount of data from the server and updating the table as soon as some data is available from the server.

### AUTHORS

* Jean Vincent  :  uiteoi@gmail.com
* Khalifa Nassik:  knassik@gmail.com
* Siham Benabbou:  sihambenabbou@gmail.com

### PURPOSE

The teaser example is a complete and stand alone ConnectedSets program that displays all 2014 sales in real time with no screen refresh as soon as any change occurs at database level.
The teaser example is made out of 5 components:

* **sales.json**: a sales database holding sales details for multiple years as well as sold quantities for each sale
* **teaser.js** : a ConnectedSets client that subscribes to server.js requesting sales for 2014 and the sold quantities by sale for the same year as soon as a CRUD occurs in sales.json
* **server.js** : a ConnectedSets server that answers teaser.js requests in realtime
* **index.html**: a ConnectedSets view layer that displays sales requested by teaser.js as they are sent by server.js and as there is a CRUD in sales.json and with no page refresh
* **table.css** : a design layer for the index.html file.

### USAGE

* **Start the server from your favorite CLI terminal (Cygwin, Linux Shell or Unix Shell):**  
_#~ node server.js_
 
* **Consume index.html from your favorite browser, except IE8 or older:**  
_http://localhost:8080/_

* **How to see realtime event requests and display:**
* Open sales.json in another terminal than the one running server.js and keep server.js running and index.html open on your browser
* Update sales.json as you wish with a couple of sales of 2014 while abiding by the json files syntax then save the changes.
* Have a look at index.html and enjoy!

### LICENCE


Copyright (C) 2013, 2014, Reactive Sets

This program is free software: you can redistribute it and/or modify
it under the terms of the GNU Affero General Public License as
published by the Free Software Foundation, either version 3 of the
License, or (at your option) any later version.

This program is distributed in the hope that it will be useful,
but WITHOUT ANY WARRANTY; without even the implied warranty of
MERCHANTABILITY or FITNESS FOR A PARTICULAR PURPOSE.  See the
GNU Affero General Public License for more details.

You should have received a copy of the GNU Affero General Public License
along with this program.  If not, see <http://www.gnu.org/licenses/>.
