"use server";

import { revalidatePath } from "next/cache";

import { getManagementContext } from "@/lib/auth/get-management-context";

export type AttendanceStatus = "present" | "absent" | "late";

export type AttendanceRecord = {
  student_id: string;
  class_id: string;
  date: string;
  status: AttendanceStatus;
  remarks?: string | null;
};

export type AttendanceHistoryRecord = {
  id: string;
  student_id: string;
  class_id: string;
  date: string;
  status: AttendanceStatus;
  remarks: string | null;
  created_at: string;
  student: {
    id: string;
    first_name: string;
    last_name: string;
    student_id: string;
  } | null;
  class: {
    id: string;
    name: string;
  } | null;
};

function getTodayDate() {
  const today = new Date();

  return [
    today.getFullYear(),
    String(today.getMonth() + 1).padStart(2, "0"),
    String(today.getDate()).padStart(2, "0"),
  ].join("-");
}

function canViewAttendance(role: string) {
  return (
    role === "super_admin" || role === "school_admin" || role === "teacher"
  );
}

function canRecordAttendance(role: string) {
  return (
    role === "super_admin" || role === "school_admin" || role === "teacher"
  );
}

/* ALL ATTENDANCE HISTORY */

export async function getAttendanceHistory(schoolId?: string) {
  try {
    const context = await getManagementContext(schoolId);

    if (!context) {
      return {
        success: false,
        error: "You are not authorized to access attendance.",
      };
    }

    if (!canViewAttendance(context.role)) {
      return {
        success: false,
        error: "You are not authorized to access attendance.",
      };
    }

    const { data: attendance, error } = await context.client
      .from("attendance")
      .select(
        `
        id,
        student_id,
        class_id,
        date,
        status,
        remarks,
        created_at
      `,
      )
      .eq("school_id", context.schoolId)
      .order("date", { ascending: false })
      .order("created_at", { ascending: false });

    if (error) {
      console.error("Get attendance history error:", error);

      return {
        success: false,
        error: error.message || "Failed to load attendance history.",
      };
    }

    const records = attendance ?? [];

    if (!records.length) {
      return {
        success: true,
        attendance: [],
      };
    }

    const studentIds = [...new Set(records.map((record) => record.student_id))];

    const classIds = [...new Set(records.map((record) => record.class_id))];

    const [
      { data: students, error: studentsError },
      { data: classes, error: classesError },
    ] = await Promise.all([
      context.client
        .from("students")
        .select(
          `
          id,
          first_name,
          last_name,
          student_id
        `,
        )
        .eq("school_id", context.schoolId)
        .in("id", studentIds),

      context.client
        .from("classes")
        .select(
          `
          id,
          name
        `,
        )
        .eq("school_id", context.schoolId)
        .in("id", classIds),
    ]);

    if (studentsError) {
      console.error("Get attendance history students error:", studentsError);
    }

    if (classesError) {
      console.error("Get attendance history classes error:", classesError);
    }

    const studentMap = new Map(
      (students ?? []).map((student) => [student.id, student]),
    );

    const classMap = new Map(
      (classes ?? []).map((schoolClass) => [schoolClass.id, schoolClass]),
    );

    const enriched = records.map((record) => ({
      ...record,
      student: studentMap.get(record.student_id) ?? null,
      class: classMap.get(record.class_id) ?? null,
    }));

    return {
      success: true,
      attendance: enriched,
    };
  } catch (error) {
    console.error("Get attendance history exception:", error);

    return {
      success: false,
      error: "An unexpected error occurred.",
    };
  }
}

/* GET ATTENDANCE */

export async function getAttendance(
  classId: string,
  date: string,
  schoolId?: string,
) {
  try {
    if (!classId) {
      return {
        success: false,
        error: "Class is required.",
      };
    }

    if (!date) {
      return {
        success: false,
        error: "Date is required.",
      };
    }

    const context = await getManagementContext(schoolId);

    if (!context) {
      return {
        success: false,
        error: "You are not authorized to access attendance.",
      };
    }

    if (!canViewAttendance(context.role)) {
      return {
        success: false,
        error: "You are not authorized to access attendance.",
      };
    }

    const { data: schoolClass, error: classError } = await context.client
      .from("classes")
      .select("id")
      .eq("id", classId)
      .eq("school_id", context.schoolId)
      .maybeSingle();

    if (classError) {
      console.error("Validate attendance class error:", classError);

      return {
        success: false,
        error: "Unable to validate the selected class.",
      };
    }

    if (!schoolClass) {
      return {
        success: false,
        error: "The selected class does not belong to this school.",
      };
    }

    const { data, error } = await context.client
      .from("attendance")
      .select(
        `
        id,
        student_id,
        class_id,
        date,
        status,
        remarks,
        created_at
      `,
      )
      .eq("school_id", context.schoolId)
      .eq("class_id", classId)
      .eq("date", date)
      .order("created_at", {
        ascending: true,
      });

    if (error) {
      console.error("Get attendance error:", error);

      return {
        success: false,
        error: error.message || "Failed to load attendance.",
      };
    }

    return {
      success: true,
      attendance: data ?? [],
    };
  } catch (error) {
    console.error("Get attendance exception:", error);

    return {
      success: false,
      error: "An unexpected error occurred.",
    };
  }
}

/* GET ATTENDANCE STUDENTS */

export async function getAttendanceStudents(
  classId: string,
  schoolId?: string,
) {
  try {
    if (!classId) {
      return {
        success: false,
        error: "Class is required.",
      };
    }

    const context = await getManagementContext(schoolId);

    if (!context) {
      return {
        success: false,
        error: "You are not authorized to access attendance.",
      };
    }

    if (!canViewAttendance(context.role)) {
      return {
        success: false,
        error: "You are not authorized to access attendance.",
      };
    }

    const { data: schoolClass, error: classError } = await context.client
      .from("classes")
      .select("id")
      .eq("id", classId)
      .eq("school_id", context.schoolId)
      .maybeSingle();

    if (classError || !schoolClass) {
      return {
        success: false,
        error: "The selected class does not belong to this school.",
      };
    }

    const { data, error } = await context.client
      .from("students")
      .select(
        `
        id,
        first_name,
        last_name,
        student_id,
        class_id,
        status
      `,
      )
      .eq("school_id", context.schoolId)
      .eq("class_id", classId)
      .eq("status", "active")
      .order("first_name", {
        ascending: true,
      })
      .order("last_name", {
        ascending: true,
      });

    if (error) {
      console.error("Get attendance students error:", error);

      return {
        success: false,
        error: error.message || "Failed to load students.",
      };
    }

    return {
      success: true,
      students: data ?? [],
    };
  } catch (error) {
    console.error("Get attendance students exception:", error);

    return {
      success: false,
      error: "An unexpected error occurred.",
    };
  }
}

/* SAVE ATTENDANCE */

export async function saveAttendance(
  records: AttendanceRecord[],
  schoolId?: string,
) {
  try {
    if (!records.length) {
      return {
        success: false,
        error: "No attendance records were provided.",
      };
    }

    const context = await getManagementContext(schoolId);

    if (!context) {
      return {
        success: false,
        error: "You are not authorized to record attendance.",
      };
    }

    if (!canRecordAttendance(context.role)) {
      return {
        success: false,
        error: "You are not authorized to record attendance.",
      };
    }

    const validStatuses: AttendanceStatus[] = ["present", "absent", "late"];

    const todayDate = getTodayDate();

    for (const record of records) {
      if (!record.student_id) {
        return {
          success: false,
          error: "A student is missing from the attendance records.",
        };
      }

      if (!record.class_id) {
        return {
          success: false,
          error: "A class is missing from the attendance records.",
        };
      }

      if (record.date !== todayDate) {
        return {
          success: false,
          error: "Attendance can only be recorded for today.",
        };
      }

      if (!validStatuses.includes(record.status)) {
        return {
          success: false,
          error: "Invalid attendance status.",
        };
      }
    }

    const classIds = [...new Set(records.map((record) => record.class_id))];

    if (classIds.length !== 1) {
      return {
        success: false,
        error: "Attendance records must belong to one class.",
      };
    }

    const classId = classIds[0];

    const { data: schoolClass, error: classError } = await context.client
      .from("classes")
      .select("id")
      .eq("id", classId)
      .eq("school_id", context.schoolId)
      .maybeSingle();

    if (classError || !schoolClass) {
      return {
        success: false,
        error: "The selected class does not belong to this school.",
      };
    }

    const studentIds = [...new Set(records.map((record) => record.student_id))];

    const { data: students, error: studentsError } = await context.client
      .from("students")
      .select("id")
      .eq("school_id", context.schoolId)
      .eq("class_id", classId)
      .in("id", studentIds);

    if (studentsError) {
      console.error("Validate attendance students error:", studentsError);

      return {
        success: false,
        error: "Unable to validate the selected students.",
      };
    }

    if (!students || students.length !== studentIds.length) {
      return {
        success: false,
        error: "One or more selected students do not belong to this class.",
      };
    }

    const rows = records.map((record) => ({
      school_id: context.schoolId,
      student_id: record.student_id,
      class_id: record.class_id,
      date: record.date,
      status: record.status,
      remarks: record.remarks?.trim() || null,
    }));

    const { data, error } = await context.client
      .from("attendance")
      .insert(rows)
      .select();

    if (error) {
      console.error("Save attendance error:", error);

      if (error.code === "23505") {
        return {
          success: false,
          error:
            "Attendance has already been recorded for one or more students today.",
        };
      }

      if (error.code === "42501") {
        return {
          success: false,
          error: "You do not have permission to record attendance.",
        };
      }

      return {
        success: false,
        error: error.message || "Failed to save attendance.",
      };
    }

    revalidatePath("/school/attendance");
    revalidatePath("/school/dashboard");

    if (schoolId) {
      revalidatePath(`/platform/schools/${schoolId}`);
      revalidatePath(`/platform/schools/${schoolId}/attendance`);
    }

    return {
      success: true,
      attendance: data ?? [],
    };
  } catch (error) {
    console.error("Save attendance exception:", error);

    return {
      success: false,
      error: "An unexpected error occurred while saving attendance.",
    };
  }
}