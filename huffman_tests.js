/**
 * Created by alan on 25/09/2016.
 */
var fs = require('fs');

var Huffman = require('./huffman_mod.js');
var huffman = new Huffman();

var text = fs.readFileSync("./accident.txt");
var view = new Uint8Array(text);

var zipped = huffman.compress(view);
var unzipped = huffman.decompress(view.length, zipped, zipped);
//
printBufferAsText(unzipped);
//
console.log("IT WORKED");
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
/*
Array.prototype.compact = function()
{
    for (var _=[], t= 0,l=this.length; t<l;t++)
        if (this[t]) _.push([String.fromCharCode(t), this[t][0], this[t][1]]);
    return _;
};

function Node(s, f)
{
    this.symbol = s;
    this.frequency = f;
    this.left = null;
    this.right = null;

    this.incFreq = function()
    {
        this.frequency += 1;
    }
}

//text = "Hello there I am testing a huffman text compression library I am in the process of writing";

//console.log("String to compress: " + text);

var nodes = [];
var numSymbols = 0;

for (var t=0; t<view.length; t++)
{
    //var s = text[t].charCodeAt(0);
    var s = view[t];
    if (!nodes[s])
    {
        nodes[s] = new Node(s, 1);
        numSymbols++;
    } else {
        nodes[s].incFreq();
    }
}

nodes.sort(function(a,b){
    return b.frequency - a.frequency;
});

nodes.splice(numSymbols, nodes.length - numSymbols);

// Build the Huffman tree ("bottom up")
while (nodes.length > 1)
{
    var l = nodes.length;
    var a = nodes[l-1];
    var b = nodes[l-2];

    var n = new Node(null, a.frequency + b.frequency);
    n.left = a;
    n.right = b;

    nodes.splice(l-2, 2);
    nodes.push(n);

    nodes.sort(function(a,b){
        return b.frequency - a.frequency;
    });
}

var huffmanTreeRoot = nodes[0];

//console.log(nodes);

// Create the Char -> Binary dictionary
var bindict = [];
WalkTree('', huffmanTreeRoot);



// Encode the string with the tree/dictionary:
var binstring = '';
var numbits = 0;
for (var t=0; t< view.length; t++)
{
    numbits += (bindict[view[t]][0].length);
    binstring += bindict[view[t]][0];
}

var bins = new BinaryWriter(Math.floor((numbits/8) + 0.5));

for (var t=0; t<view.length; t++)
{
    bins.append(bindict[view[t]][0]);
}

bins.finish();


console.log("Compressed length = "+binstring.length+" bits");
console.log("Uncompressed length = "+(text.length*8)+" bits");
console.log("Compression rate: "+(100-(binstring.length / (view.length*8) * 100)).toFixed(1) +' %');

console.log("");

//console.log("Decompressing.....");

var writer = new TreeWriter();

SerialiseNode(huffmanTreeRoot, writer);

console.log("Tree size in bytes = "+writer.finish());
//console.log("buff size = ", writer.binary.byteLength);

console.log("Ziptree len=" + zipped.tree.buffer.length);
console.log(zipped.tree.writeOutBinary());
console.log("---------");
writer.writeOutBinary();

var reader = new TreeReader(zipped.tree.buffer);

//for (var t=0; t<16; t++)
//{
//    console.log(reader.readBit());
//}
//
//process.exit(0);

reader.buffer = writer.buffer;

var newTree = DeserialiseNode(reader);

var org_data = decompress2(view.length, bins.buffer, newTree);
printBufferAsText(org_data);

function SerialiseNode(node, writer)
{
    if (node.symbol)
    {
        writer.writeBit(1);
        writer.writeByte(node.symbol);
    } else {
        writer.writeBit(0);
        SerialiseNode(node.left, writer);
        SerialiseNode(node.right, writer);
    }
}

function DeserialiseNode(reader)
{
    var bit = reader.readBit();

    //console.log(bit);

    if (bit == 1)
    {   var byte = reader.readByte();
        //console.log('B'+byte);
        var n = new Node(byte, null);
        //console.log("LEAF NODE for symbol:" + String.fromCharCode(n.symbol));
        return n;
    } else if (bit == 0) {
        var left = DeserialiseNode(reader);
        var right = DeserialiseNode(reader);

        var n = new Node(null, null);
        n.left = left;
        n.right = right;
        return n;
    } else {
        return null;
    }
}

function TreeWriter()
{
    this.buffer = "";

    this.binary = new ArrayBuffer(4096);
    this.bytes = new Uint8Array(this.binary);
    this.byteBufferPointer = 0;

    this.currentByte = 0;
    this.bitPointer = 7;
    this.finalSizeBytes = -1;

    this.flushByte = function()
    {
        this.bytes[this.byteBufferPointer++] = this.currentByte;
        this.currentByte = 0;
        this.bitPointer = 7;
    };

    this.finish = function()
    {
        if (this.bitPointer != 7)
            this.bytes[this.byteBufferPointer] = this.currentByte;

        this.binary = this.binary.slice(0,this.byteBufferPointer+1);
        this.finalSizeBytes = this.byteBufferPointer+1;
        return this.finalSizeBytes;

    };

    this.writeRealBit = function(bit)
    {
        this.currentByte |= (bit&1) << this.bitPointer;
        if (--this.bitPointer < 0) this.flushByte();
    };

    this.writeBit = function(bit)
    {
        this.writeRealBit(bit);
        var s = this.buffer.length;
        this.buffer += bit.toString();
    };

    this.writeByte = function(byte)
    {
        //console.log("Writing value: "+byte);
        var b = byte&255;
        var bs = "";
        for (var t=7; t>=0; t--)
        {
            var bit = ((byte >> t) & 1);
            bs += bit;
            this.writeRealBit(bit);
        }
        //console.log("As binary: ", bs);
        var hex = byte.toString(16);
        this.buffer += hex.length == 1 ? '0'+hex : hex;
    };

    this.writeOutBinary = function()
    {
        var s = "";
        for (var t=0; t<this.finalSizeBytes; t++)
        {
            var byte = this.bytes[t];

            for (var b= 7; b>=0; b--)
            {
                s+= ''+((byte>>b)&1)+'';
            }
        }
        console.log(s);
    };
}

function TreeReader(treeBinary)
{
    this.buffer = "";
    this.ptr = 0;
    this.treeBinary = treeBinary;
    this.bytes = new Uint8Array(this.treeBinary);
    this.bitPosition = 7;
    this.bytePosition = 0;
    this.currentByte = this.bytes[this.bytePosition];


    this._getNextBit = function()
    {
        var bit = (this.currentByte >> this.bitPosition) & 1;
        this._moveNextBit();
        return bit;
    };

    this._moveNextBit = function()
    {
        this.bitPosition--;
        if (this.bitPosition < 0)
        {
            this.bitPosition = 7;
            this.bytePosition++;
            this.currentByte = this.bytes[this.bytePosition];
        }

    };

    this.readBit = function()
    {
        var r = this.buffer[this.ptr++];
        var b = this._getNextBit();

        return b;

        //console.log("Bit old method: "+r+", New method: "+b);
        //return r;
    };

    this.readByte = function()
    {
        var byte = 0;
        for (var t=7; t>=0; t--)
        {
            byte |= (this._getNextBit() << t)

        }
        return byte;
        //console.log("Read byte val = "+byte);
        var r = parseInt(this.buffer[this.ptr++]+''+this.buffer[this.ptr++], 16);
        //console.log("Byte: "+r);
        return r;
    };

}





function printBufferAsText(buffer)
{
    var s = "";
    for (var t=0; t<buffer.length; t++)
    {
        s += String.fromCharCode(buffer[t]);
    }

    console.log(s);
}

function HuffmanDecoder()
{
    this.rootNode = null;
    this.currentNode = null;

    this.walk = function(bin)
    {
        if (!this.currentNode) this.currentNode = this.rootNode;

        if (bin == '0')
            this.currentNode = this.currentNode.left;
        else
            this.currentNode = this.currentNode.right;

        if (this.currentNode.symbol)
        {
            var s = this.currentNode.symbol;
            this.currentNode = this.rootNode;
            return s;

        } else
        {
            return null;
        }


    };

}



function decompress2(size, binbuffer, huffmanTreeRoot)
{
    var binreader = new BinaryReader(binbuffer);
    var decoder = new HuffmanDecoder();
    decoder.rootNode = huffmanTreeRoot;
    var decompressedArray = new ArrayBuffer(size);
    var bview = new Uint8Array(decompressedArray);
    var bviewPtr = 0 ;

    while ((b = binreader.readBit()) != null)
    {
        var r = decoder.walk(b);

        if (r)
            bview[bviewPtr++] = r;
    }

    return bview;
}

function decompress(size, binstring, huffmanTreeRoot)
{
    var decoder = new HuffmanDecoder();
    decoder.rootNode = huffmanTreeRoot;
    var decompressedArray = new ArrayBuffer(size);
    var bview = new Uint8Array(decompressedArray);
    var bviewPtr = 0 ;

    for (var t=0; t<binstring.length; t++)
    {
        var b = binstring[t];
        var r = decoder.walk(b);
        //if (r) uncompressedString += String.fromCharCode(r);
        if (r)
            bview[bviewPtr++] = r;
    }

    return bview;
}


function WalkTree(binstr, node)
{
    if (node.symbol)
    {
        bindict[node.symbol] = [binstr, node.frequency];
        //console.log(binstr + ": [LEAF] Symbol '" + String.fromCharCode(node.symbol) + "', freq=" + node.frequency);
    }
    //else
     //   console.log("[NODE] Summed Freq underneath="+node.frequency);
    if (node.right)
        WalkTree(binstr+'1', node.right);

    if (node.left)
        WalkTree(binstr+'0', node.left);

}


function BinaryReader(buffer)
{
    this.bytes = new Uint8Array(buffer);
    this.bitPosition = 7;
    this.bytePosition = 0;
    this.currentByte = this.bytes[this.bytePosition];


    this._getNextBit = function()
    {
        var bit = (this.currentByte >> this.bitPosition) & 1;

        return !this._moveNextBit() ? null : bit;
    };

    this._moveNextBit = function()
    {
        this.bitPosition--;
        if (this.bitPosition < 0)
        {
            this.bitPosition = 7;
            this.bytePosition++;
            if (this.bytePosition >= this.bytes.length) return false;
            this.currentByte = this.bytes[this.bytePosition];
        }
        return true;
    };

    this.readBit = function()
    {
        return this._getNextBit();
    };

    this.readByte = function()
    {
        var byte = 0;
        for (var t=7; t>=0; t--)
            byte |= (this._getNextBit() << t);

        return byte;
    };

}

function BinaryWriter(maxLength)

{
    this.buffer = new Uint8Array(maxLength);

    this.byteBufferPointer = 0;
    this.currentByte = 0;
    this.bitPointer = 7;

    this.flushByte = function()
    {
        this.buffer[this.byteBufferPointer++] = this.currentByte;
        this.currentByte = 0;
        this.bitPointer = 7;
    };

    this.finish = function()
    {
        if (this.bitPointer != 7)
            this.buffer[this.byteBufferPointer] = this.currentByte;
    };

    this.add = function(bit)
    {
        this.currentByte |= (bit & 1) << this.bitPointer;
        if (--this.bitPointer < 0) this.flushByte();
    };

    this.append = function(bits)
    {
        for (var t= 0,l=bits.length;t<l;t++)
        {
            var bit = parseInt(bits[t]);
            this.add(bit);
        }
    };

    this.writeOutBinary = function()
    {
        var s = "";
        for (var t=0; t<this.buffer.length; t++)
        {
            var byte = this.buffer[t];

            for (var b= 7; b>=0; b--)
            {
                s += ''+((byte>>b)&1)+'';
            }
        };

        return s;
    }
}

    */