/**
 * Created by alan on 25/09/2016.
 */
var fs = require('fs');

var Huffman = require('./huffman');
var huffman = new Huffman();

var text = fs.readFileSync("./accident.txt"); // load any old text file
var view = new Uint8Array(text);

var zipped = huffman.compress(view);

console.log("Compressed file to " + ((zipped.length / view.length)*100).toFixed(1)+" % of original");

var unzipped = huffman.decompress(zipped);
//
printBufferAsText(unzipped);
//
process.exit(0);


function printBufferAsText(buffer)
{
    var s = "";
    for (var t=0; t<buffer.length; t++)
    {
        s += String.fromCharCode(buffer[t]);
    }

    console.log(s);
}
