import { useEffect, useRef, useState } from "react";
import AsyncStorage from "@react-native-async-storage/async-storage";
import { initialData, parseData, type AppData } from "./model";
const KEY = "@plcr/app/v1";
export function useProjectStore() {
  const [data, setData] = useState<AppData>(initialData);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState("");
  const latest = useRef(data);
  const queue = useRef(Promise.resolve());
  async function load() {
    setLoading(true);
    setError("");
    try {
      const next = parseData(await AsyncStorage.getItem(KEY));
      latest.current = next;
      setData(next);
    } catch (e) {
      setError(
        `Could not read saved projects. ${e instanceof Error ? e.message : String(e)}`,
      );
    } finally {
      setLoading(false);
    }
  }
  useEffect(() => {
    void load();
  }, []);
  function update(change: (previous: AppData) => AppData): Promise<void> {
    const task = queue.current.then(async () => {
      const next = change(latest.current);
      await AsyncStorage.setItem(KEY, JSON.stringify(next));
      latest.current = next;
      setData(next);
    });
    queue.current = task.catch(() => {});
    return task;
  }
  return { data, loading, error, update, retry: load };
}
