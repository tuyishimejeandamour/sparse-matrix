const fs = require('fs').promises;
const readline = require('readline');

class FileHandler {
    static async readMatrix(filename) {
        try {
            const content = await fs.readFile(filename, 'utf8');
            const lines = content.split('\n').map(line => line.trim()).filter(line => line);

            if (lines.length < 3) {
                throw new Error('Input file has insufficient data');
            }

            const rowMatch = lines[0].match(/rows=(\d+)/);
            const colMatch = lines[1].match(/cols=(\d+)/);

            if (!rowMatch || !colMatch) {
                throw new Error('Input file has wrong format');
            }

            const rows = parseInt(rowMatch[1]);
            const cols = parseInt(colMatch[1]);
            const elements = [];

            for (let i = 2; i < lines.length; i++) {
                const match = lines[i].match(/\((\d+),\s*(\d+),\s*(-?\d+)\)/);
                if (match) {
                    const [, row, col, value] = match;
                    elements.push([parseInt(row), parseInt(col), parseInt(value)]);
                }
            }

            return { rows, cols, elements };
        } catch (error) {
            throw new Error(`Unable to read input file: ${error.message}`);
        }
    }

    static async writeMatrix(filename, matrix) {
        try {
            let content = `rows=${matrix.rows}\n`;
            content += `cols=${matrix.cols}\n`;
            for (const [row, col, value] of matrix) {
                content += `(${row}, ${col}, ${value})\n`;
            }
            await fs.writeFile(filename, content);
        } catch (error) {
            throw new Error(`Unable to write output file: ${error.message}`);
        }
    }
}

class SparseMap {
    constructor(rows, cols) {
        this.rows = rows;
        this.cols = cols;
        this.elements = new Map();
    }

    getKey(row, col) {
        return row * this.cols + col;
    }

    get(row, col) {
        return this.elements.get(this.getKey(row, col)) || 0;
    }

    set(row, col, value) {
        const key = this.getKey(row, col);
        if (value !== 0) {
            this.elements.set(key, value);
        } else {
            this.elements.delete(key);
        }
    }

    *[Symbol.iterator]() {
        for (const [key, value] of this.elements) {
            const row = Math.floor(key / this.cols);
            const col = key % this.cols;
            yield [row, col, value];
        }
    }

    get size() {
        return this.elements.size;
    }
}

class SparseMatrix {
    constructor(input) {
        if (input instanceof SparseMap) {
            this.data = input;
        } else if (Array.isArray(input) && input.length === 2) {
            this.data = new SparseMap(input[0], input[1]);
        } else {
            throw new Error('Invalid input for SparseMatrix constructor');
        }
    }

    static async fromFile(filename) {
        const { rows, cols, elements } = await FileHandler.readMatrix(filename);
        const matrix = new SparseMatrix([rows, cols]);
        for (const [row, col, value] of elements) {
            matrix.setElement(row, col, value);
        }
        return matrix;
    }

    get rows() {
        return this.data.rows;
    }

    get cols() {
        return this.data.cols;
    }

    getElement(row, col) {
        return this.data.get(row, col);
    }

    setElement(row, col, value) {
        this.data.set(row, col, value);
    }

    add(other) {
        
        const result = new SparseMatrix([this.rows, this.cols]);
        for (const [row, col, value] of this.data) {
            result.setElement(row, col, value);
        }
        for (const [row, col, value] of other.data) {
            result.setElement(row, col, result.getElement(row, col) + value);
        }
        return result;
    }

    subtract(other) {

        const result = new SparseMatrix([this.rows, this.cols]);
        for (const [row, col, value] of this.data) {
            result.setElement(row, col, value);
        }
        for (const [row, col, value] of other.data) {
            result.setElement(row, col, result.getElement(row, col) - value);
        }
        return result;
    }

    multiply(other) {
        if (this.cols !== other.rows) {
            throw new Error('Matrix dimensions are not compatible for multiplication');
        }

        const result = new SparseMatrix([this.rows, other.cols]);
        for (const [i, k, value1] of this.data) {
            for (const [row, j, value2] of other.data) {
                if (k === row) {
                    const currVal = result.getElement(i, j);
                    result.setElement(i, j, currVal + value1 * value2);
                }
            }
        }
        return result;
    }

    async saveToFile(filename) {
        await FileHandler.writeMatrix(filename, this);
    }

    toString() {
        return `Matrix ${this.rows}x${this.cols} with ${this.data.size} non-zero elements`;
    }

    *[Symbol.iterator]() {
        yield* this.data;
    }
}

async function main() {
    const rl = readline.createInterface({
        input: process.stdin,
        output: process.stdout
    });

    try {
        console.log("Select operation:\n1. Addition\n2. Subtraction\n3. Multiplication");
        const choice = await new Promise(resolve => rl.question("Enter your choice: ", resolve));

        const file1 = await new Promise(resolve => rl.question("Enter the first input file path: ", resolve));
        const file2 = await new Promise(resolve => rl.question("Enter the second input file path: ", resolve));

        const matrix1 = await SparseMatrix.fromFile(file1);
        const matrix2 = await SparseMatrix.fromFile(file2);

        let result;
        switch (choice) {
            case '1':
                result = matrix1.add(matrix2);
                break;
            case '2':
                result = matrix1.subtract(matrix2);
                break;
            case '3':
                result = matrix1.multiply(matrix2);
                break;
            default:
                throw new Error('Invalid operation choice');
        }

        const outputFile = 'result.txt';
        await result.saveToFile(outputFile);
        console.log(`Result saved to ${outputFile}`);
    } catch (error) {
        console.error("Error:", error.message);
    } finally {
        rl.close();
    }
}

main();