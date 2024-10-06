const fs = require('fs').promises;
const readline = require('readline');

class SparseMatrix {
    constructor(input) {
        this.rows = 0;
        this.cols = 0;
        this.elements = new Map();

        if (typeof input === 'string') {
            this.loadPromise = this.loadFromFile(input);
        } else if (Array.isArray(input) && input.length === 2) {
            [this.rows, this.cols] = input;
        } else {
            throw new Error('Invalid input for SparseMatrix constructor');
        }
    }

    async loadFromFile(filename) {
        try {
            const fileContent = await fs.readFile(filename, 'utf8');
            const lines = fileContent.split('\n').map(line => line.trim()).filter(line => line);

            if (lines.length < 3) {
                throw new Error('Input file has insufficient data');
            }

            const rowMatch = lines[0].match(/rows=(\d+)/);
            const colMatch = lines[1].match(/cols=(\d+)/);

            if (!rowMatch || !colMatch) {
                throw new Error('Input file has wrong format');
            }

            this.rows = parseInt(rowMatch[1]);
            this.cols = parseInt(colMatch[1]);

            for (let i = 2; i < lines.length; i++) {
                const match = lines[i].match(/\((\d+),\s*(\d+),\s*(-?\d+)\)/);
                if (match) {
                    const [, row, col, value] = match;
                    this.setElement(parseInt(row), parseInt(col), parseInt(value));
                }
            }
        } catch (error) {
            throw new Error(`Unable to open input file: ${error.message}`);
        }
    }

    getElement(currRow, currCol) {
        const key = `${currRow},${currCol}`;
        return this.elements.get(key) || 0;
    }

    setElement(currRow, currCol, value) {
        const key = `${currRow},${currCol}`;
        if (value !== 0) {
            this.elements.set(key, value);
        } else {
            this.elements.delete(key);
        }
    }

    add(other) {
        // if (this.rows !== other.rows || this.cols !== other.cols) {
        //     throw new Error('Matrix dimensions do not match for addition');
        // }

        const result = new SparseMatrix([this.rows, this.cols]);
        for (const [key, value] of this.elements) {
            result.elements.set(key, value);
        }
        for (const [key, value] of other.elements) {
            const [row, col] = key.split(',').map(Number);
            result.setElement(row, col, result.getElement(row, col) + value);
        }
        return result;
    }

    subtract(other) {
        // if (this.rows !== other.rows || this.cols !== other.cols) {
        //     throw new Error('Matrix dimensions do not match for subtraction');
        // }

        const result = new SparseMatrix([this.rows, this.cols]);
        for (const [key, value] of this.elements) {
            result.elements.set(key, value);
        }
        for (const [key, value] of other.elements) {
            const [row, col] = key.split(',').map(Number);
            result.setElement(row, col, result.getElement(row, col) - value);
        }
        return result;
    }

    multiply(other) {
        if (this.cols !== other.rows) {
            throw new Error('Matrix dimensions are not compatible for multiplication');
        }

        const result = new SparseMatrix([this.rows, other.cols]);
        for (const [key1, value1] of this.elements) {
            const [i, k] = key1.split(',').map(Number);
            for (const [key2, value2] of other.elements) {
                const [row, j] = key2.split(',').map(Number);
                if (k === row) {
                    const currVal = result.getElement(i, j);
                    result.setElement(i, j, currVal + value1 * value2);
                }
            }
        }
        return result;
    }

    async saveToFile(filename) {
        let content = `rows=${this.rows}\n`;
        content += `cols=${this.cols}\n`;
        for (const [key, value] of this.elements) {
            const [row, col] = key.split(',');
            content += `(${row}, ${col}, ${value})\n`;
        }
        await fs.writeFile(filename, content);
    }

    toString() {
        return `Matrix ${this.rows}x${this.cols} with ${this.elements.size} non-zero elements`;
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

        const matrix1 = new SparseMatrix(file1);
        const matrix2 = new SparseMatrix(file2);

        await matrix1.loadPromise;
        await matrix2.loadPromise;

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