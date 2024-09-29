import { useEffect, useState } from "react";
import { WalletSelector } from "@aptos-labs/wallet-adapter-ant-design";
import { Aptos } from "@aptos-labs/ts-sdk";
import { Checkbox } from "antd";
import {
  useWallet,
  InputTransactionData,
} from "@aptos-labs/wallet-adapter-react";
import { CheckboxChangeEvent } from "antd/es/checkbox";

import "@aptos-labs/wallet-adapter-ant-design/dist/index.css";

import { moduleAddress } from "./Constant";

type Task = {
  address: string;
  completed: boolean;
  content: string;
  task_id: string;
};

const Home = () => {
  const aptos = new Aptos();
  const { account, signAndSubmitTransaction } = useWallet();

  const [accountHasList, setAccountHasList] = useState<boolean>(false);
  const [tasks, setTasks] = useState<Task[]>([]);
  const [newTask, setNewTask] = useState<string>("");
  // eslint-disable-next-line @typescript-eslint/no-unused-vars
  const [transactionInProgress, setTransactionInProgress] =
    useState<boolean>(false);

  const onWriteTask = (event: React.ChangeEvent<HTMLInputElement>) => {
    const value = event.target.value;
    setNewTask(value);
  };

  const addNewList = async () => {
    if (!account) return [];

    const transaction: InputTransactionData = {
      data: {
        function: `${moduleAddress}::todolist::create_list`,
        functionArguments: [],
      },
    };
    try {
      // sign and submit transaction to chain
      const response = await signAndSubmitTransaction(transaction);
      // wait for transaction
      await aptos.waitForTransaction({ transactionHash: response.hash });
      setAccountHasList(true);
    } catch (error: unknown) {
      console.log(error);
      setAccountHasList(false);
    }
  };

  const fetchList = async () => {
    if (!account) return [];
    try {
      const todoListResource = await aptos.getAccountResource({
        accountAddress: account?.address,
        resourceType: `${moduleAddress}::todolist::TodoList`,
      });
      setAccountHasList(true);
      // tasks table handle
      // eslint-disable-next-line @typescript-eslint/no-explicit-any
      const tableHandle = (todoListResource as any).tasks.handle;
      // tasks table counter
      // eslint-disable-next-line @typescript-eslint/no-explicit-any
      const taskCounter = (todoListResource as any).task_counter;

      const tasks = [];
      let counter = 1;
      while (counter <= taskCounter) {
        const tableItem = {
          key_type: "u64",
          value_type: `${moduleAddress}::todolist::Task`,
          key: `${counter}`,
        };
        const task = await aptos.getTableItem<Task>({
          handle: tableHandle,
          data: tableItem,
        });
        tasks.push(task);
        counter++;
      }
      // set tasks in local state
      setTasks(tasks);
    } catch (e: unknown) {
      console.log(e);
      setAccountHasList(false);
    }
  };

  useEffect(() => {
    fetchList();
  }, [account?.address]);

  const onTaskAdded = async () => {
    if (!account) return;

    if (!newTask) return;
    setTransactionInProgress(true);
    const transaction: InputTransactionData = {
      data: {
        function: `${moduleAddress}::todolist::create_task`,
        functionArguments: [newTask],
      },
    };

    // hold the latest task.task_id from our local state
    const latestId =
      tasks.length > 0 ? parseInt(tasks[tasks.length - 1].task_id) + 1 : 1;

    // build a newTaskToPush object into our local state
    const newTaskToPush = {
      address: account.address,
      completed: false,
      content: newTask,
      task_id: latestId + "",
    };

    try {
      // sign and submit transaction to chain
      const response = await signAndSubmitTransaction(transaction);
      // wait for transaction
      await aptos.waitForTransaction({ transactionHash: response.hash });

      // Create a new array based on current state:
      const newTasks = [...tasks];

      // Add item to the tasks array
      newTasks.push(newTaskToPush);
      // Set state
      setTasks(newTasks);
      // clear input text
      setNewTask("");
    } catch (error: unknown) {
      console.log("error", error);
    } finally {
      setTransactionInProgress(false);
    }
  };

  const onCheckboxChange = async (
    event: CheckboxChangeEvent,
    taskId: string
  ) => {
    if (!account) return;
    if (!event.target.checked) return;
    setTransactionInProgress(true);
    const transaction: InputTransactionData = {
      data: {
        function: `${moduleAddress}::todolist::complete_task`,
        functionArguments: [taskId],
      },
    };

    try {
      // sign and submit transaction to chain
      const response = await signAndSubmitTransaction(transaction);
      // wait for transaction
      await aptos.waitForTransaction({ transactionHash: response.hash });

      setTasks((prevState) => {
        const newState = prevState.map((obj) => {
          // if task_id equals the checked taskId, update completed property
          if (obj.task_id === taskId) {
            return { ...obj, completed: true };
          }

          // otherwise return object as is
          return obj;
        });

        return newState;
      });
    } catch (error: unknown) {
      console.log("error", error);
    } finally {
      setTransactionInProgress(false);
    }
  };

  return (
    <div className="h-screen flex flex-col bg-zinc-950 text-[#272824]">
      <header className="bg-zinc-900 w-full py-3 shadow-md flex justify-between px-3 shadow-zinc-700">
        <h1 className="text-xl text-[#E0E1DA] bg-zinc-700 rounded-full px-4 py-2 hover:shadow-sm hover:shadow-white hover:bg-zinc-600 duration-300 transition">
          Plan Your Day
        </h1>
        <WalletSelector />
      </header>

      <div className="flex-grow flex flex-col justify-center items-center">
        {!accountHasList ? (
          <div className="flex flex-col justify-center items-center">
            <h2 className="text-xl font-bold mb-4">Create Your To-Do List</h2>
            <button
              disabled={!account}
              onClick={addNewList}
              className={`bg-[#3f67ff] text-white py-2 px-6 rounded-full shadow-lg hover:shadow-xl transition-transform ${
                !account ? "opacity-50 cursor-not-allowed" : "hover:scale-105"
              }`}
            >
              Add New List
            </button>
          </div>
        ) : (
          <div className="w-full max-w-lg mt-8">
            <div className="overflow-y-auto h-80 w-full max-w-lg border border-zinc-600 rounded-lg bg-[#E0E1DA] shadow-md">
              <ul className="flex flex-col-reverse">
                {tasks.map((task) => (
                  <li
                    key={task.task_id}
                    className="flex justify-between items-center p-4 hover:bg-zinc-100 hover:rounded-xl transition"
                  >
                    <span
                      className={`${
                        task.completed
                          ? "line-through text-zinc-900"
                          : "text-zinc-900 font-bold"
                      }`}
                    >
                      {task.content}
                    </span>
                    <div>
                      {task.completed ? (
                        <Checkbox defaultChecked={true} disabled />
                      ) : (
                        <Checkbox
                          onChange={(event) =>
                            onCheckboxChange(event, task.task_id)
                          }
                        />
                      )}
                    </div>
                  </li>
                ))}
              </ul>
            </div>

            <div className="flex w-full max-w-lg mt-4 space-x-1">
              <input
                type="text"
                onChange={onWriteTask}
                placeholder="Add a Task"
                value={newTask}
                className="flex-grow bg-zinc-100 rounded-l-lg px-4 py-3 text-zinc-900 placeholder-zinc-400 focus:ring-2 focus:ring-blue-500 hover:bg-zinc-200"
              />
              <button
                onClick={onTaskAdded}
                className="bg-[#3f67ff] text-white rounded-r-lg px-6 py-3 hover:bg-[#3468e5] transition duration-300"
              >
                Add
              </button>
            </div>
          </div>
        )}
      </div>

      <footer className="bg-zinc-900 shadow-inner shadow-zinc-700 text-zinc-400 flex justify-center items-center p-4">
        <p>
          Manage your day with ease!{" "}
          <span className="text-gray-300 text-xs">(Aptos)</span>
        </p>
      </footer>
    </div>
  );
};

export default Home;
