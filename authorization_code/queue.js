class Queue {
    constructor() {
        this.items = [];
    }

    //enqueue function
    enqueue(element) {
        this.items.push(element);
    }

    //dequeue function
    dequeue() {
        if(this.isEmpty())
            return 'Empty!';
        return this.items.shift();
    }

    //front function see the front object without removal
    front() {
        if(this.isEmpty())
            return 'Empty queue';
        return this.items[0];
    }

    //isEmpty function
    isEmpty() {
        return this.items.length == 0;
    }

    //printQueue function
    printQueue() {
        var str = '';
        for(var i = 0; i < this.items.length; i++)
            str += this.items[i] + ' ';
        return str;
    }
}