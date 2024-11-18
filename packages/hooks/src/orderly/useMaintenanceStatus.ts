import { useEffect, useState } from "react";
import { useConfig } from "../useConfig";
import { useQuery } from "../useQuery";
import { useWS } from "../useWS";

enum MaintenanceStatus {
  OPERATIONAL = 0,
  MAINTENANCE = 2,
}

interface SystemInfo {
  data: {
    status: MaintenanceStatus;
    scheduled_maintenance?: {
      start_time: number;
      end_time: number;
    };
  };
}

interface MaintenanceMessage {
  status: MaintenanceStatus;
  scheduled_maintenance?: {
    start_time: number;
    end_time: number;
  };
}

export function useMaintenanceStatus() {
  const [status, setStatus] = useState<MaintenanceStatus>(
    MaintenanceStatus.OPERATIONAL
  );
  const [startTime, setStartTime] = useState<number>();
  const [endTime, setEndTime] = useState<number>();
  const [brokerName, setBrokerName] = useState<string>("Orderly network");
  const { data: systemInfo } = useQuery<SystemInfo>(`/v1/public/system_info`, {
    revalidateOnFocus: false,
    errorRetryCount: 2,
    errorRetryInterval: 200,
  });
  const ws = useWS();

  const config = useConfig();

  useEffect(() => {
    if (!systemInfo || !systemInfo.data) {
      return;
    }

    const brokerName = config.get("brokerName");
    if (brokerName) {
      setBrokerName(brokerName);
    }
    if (systemInfo.data.scheduled_maintenance) {
      setStartTime(systemInfo.data.scheduled_maintenance.start_time);
      setEndTime(systemInfo.data.scheduled_maintenance.end_time);
    }
    if (systemInfo.data.status === MaintenanceStatus.MAINTENANCE) {
      setStatus(MaintenanceStatus.MAINTENANCE);
    }
  }, [systemInfo, config]);

  useEffect(() => {
    const unsubscribe = ws.subscribe(`maintenance_status`, {
      onMessage: (message: MaintenanceMessage) => {
        setStatus(message.status);
        console.log("-- ws maintenance_status", message);
        if (message.scheduled_maintenance) {
          setStartTime(message.scheduled_maintenance.start_time);
          setEndTime(message.scheduled_maintenance.end_time);
        }
      },
    });

    return () => {
      unsubscribe?.();
    };
  }, []);

  return {
    status,
    brokerName,
    startTime,
    endTime,
  };
}
