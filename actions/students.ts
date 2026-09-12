// "use server";

// import { revalidatePath } from "next/cache";

// import { createClient } from "@/lib/supabase/server";
// import { getCurrentUser } from "@/lib/auth/get-user";
// import { getManagementContext } from "@/lib/auth/get-management-context";

// export type StudentFormData = {
//   first_name: string;
//   last_name: string;
//   student_id: string;
//   gender?: string | null;
//   date_of_birth?: string | null;
//   class_id?: string | null;
//   phone?: string | null;
//   address?: string | null;
//   status?: string | null;
// };

// type ActionResult = {
//   success: boolean;
//   error?: string;
//   student?: Record<string, unknown> | null;
// };

// function formDataToStudentData(formData: FormData): StudentFormData {
//   return {
//     first_name: String(formData.get("first_name") ?? ""),
//     last_name: String(formData.get("last_name") ?? ""),
//     student_id: String(formData.get("student_id") ?? ""),
//     gender: String(formData.get("gender") ?? "") || null,
//     date_of_birth: String(formData.get("date_of_birth") ?? "") || null,
//     class_id: String(formData.get("class_id") ?? "") || null,
//     phone: String(formData.get("phone") ?? "") || null,
//     address: String(formData.get("address") ?? "") || null,
//     status: String(formData.get("status") ?? "") || "active",
//   };
// }

// function validateStudentData(data: StudentFormData) {
//   const firstName = data.first_name.trim();
//   const lastName = data.last_name.trim();
//   const studentId = data.student_id.trim();

//   if (!firstName) {
//     return {
//       valid: false as const,
//       error: "First name is required.",
//     };
//   }

//   if (!lastName) {
//     return {
//       valid: false as const,
//       error: "Last name is required.",
//     };
//   }

//   if (!studentId) {
//     return {
//       valid: false as const,
//       error: "Student ID is required.",
//     };
//   }

//   return {
//     valid: true as const,
//     firstName,
//     lastName,
//     studentId,
//   };
// }

// /* =========================================================
//    MANAGEMENT CONTEXT
// ========================================================= */

// async function getStudentManagementContext(requestedSchoolId?: string | null) {
//   const user = await getCurrentUser();

//   if (!user) {
//     return {
//       success: false as const,
//       error: "You must be logged in.",
//     };
//   }

//   /*
//    * Super admins must specify which school they are managing.
//    */
//   if (user.role === "super_admin") {
//     if (!requestedSchoolId) {
//       return {
//         success: false as const,
//         error: "A school must be selected.",
//       };
//     }

//     const context = await getManagementContext(requestedSchoolId);

//     if (!context || context.role !== "super_admin") {
//       return {
//         success: false as const,
//         error: "You are not authorized to manage this school.",
//       };
//     }

//     return {
//       success: true as const,
//       user,
//       schoolId: context.schoolId,
//       client: context.client,
//       role: context.role,
//     };
//   }

//   /*
//    * Existing school-admin behavior.
//    */
//   if (user.role !== "school_admin") {
//     return {
//       success: false as const,
//       error: "You do not have permission to manage students.",
//     };
//   }

//   if (!user.schoolId) {
//     return {
//       success: false as const,
//       error: "No school is associated with your account.",
//     };
//   }

//   /*
//    * Prevent a normal school admin from targeting another school.
//    */
//   if (requestedSchoolId && requestedSchoolId !== user.schoolId) {
//     return {
//       success: false as const,
//       error: "You cannot manage another school.",
//     };
//   }

//   return {
//     success: true as const,
//     user,
//     schoolId: user.schoolId,
//     client: await createClient(),
//     role: user.role,
//   };
// }

// /* =========================================================
//    CREATE STUDENT
// ========================================================= */

// export async function createStudent(formData: FormData): Promise<ActionResult> {
//   try {
//     const requestedSchoolId =
//       String(formData.get("school_id") ?? "").trim() || null;

//     const context = await getStudentManagementContext(requestedSchoolId);

//     if (!context.success) {
//       return context;
//     }

//     const data = formDataToStudentData(formData);

//     const validation = validateStudentData(data);

//     if (!validation.valid) {
//       return {
//         success: false,
//         error: validation.error,
//       };
//     }

//     /*
//      * Make sure the selected class belongs to the
//      * same school before inserting the student.
//      */
//     if (data.class_id) {
//       const { data: schoolClass, error: classError } = await context.client
//         .from("classes")
//         .select("id")
//         .eq("id", data.class_id)
//         .eq("school_id", context.schoolId)
//         .maybeSingle();

//       if (classError) {
//         console.error("Validate student class error:", classError);

//         return {
//           success: false,
//           error: "Unable to validate the selected class.",
//         };
//       }

//       if (!schoolClass) {
//         return {
//           success: false,
//           error: "The selected class does not belong to your school.",
//         };
//       }
//     }

//     const { data: student, error } = await context.client
//       .from("students")
//       .insert({
//         school_id: context.schoolId,
//         first_name: validation.firstName,
//         last_name: validation.lastName,
//         student_id: validation.studentId,
//         gender: data.gender?.trim() || null,
//         date_of_birth: data.date_of_birth || null,
//         class_id: data.class_id || null,
//         phone: data.phone?.trim() || null,
//         address: data.address?.trim() || null,
//         status: data.status || "active",
//       })
//       .select()
//       .single();

//     if (error) {
//       console.error("Create student error:", error);

//       switch (error.code) {
//         case "23505":
//           return {
//             success: false,
//             error:
//               "A student with this student ID already exists in this school.",
//           };

//         case "23503":
//           return {
//             success: false,
//             error: "The selected class does not exist.",
//           };

//         case "42501":
//           return {
//             success: false,
//             error:
//               "You do not have permission to create students in this school.",
//           };

//         default:
//           return {
//             success: false,
//             error: error.message || "Failed to create student.",
//           };
//       }
//     }

//     revalidatePath("/school/students");
//     revalidatePath("/school/dashboard");

//     if (requestedSchoolId) {
//       revalidatePath(`/platform/schools/${requestedSchoolId}`);
//       revalidatePath(`/platform/schools/${requestedSchoolId}/students`);
//     }

//     return {
//       success: true,
//       student,
//     };
//   } catch (error) {
//     console.error("Create student exception:", error);

//     return {
//       success: false,
//       error: "An unexpected error occurred while creating the student.",
//     };
//   }
// }

// /* =========================================================
//    UPDATE STUDENT
// ========================================================= */

// export async function updateStudent(formData: FormData): Promise<ActionResult> {
//   try {
//     const requestedSchoolId =
//       String(formData.get("school_id") ?? "").trim() || null;

//     const context = await getStudentManagementContext(requestedSchoolId);

//     if (!context.success) {
//       return context;
//     }

//     const studentId = String(formData.get("id") ?? "").trim();

//     if (!studentId) {
//       return {
//         success: false,
//         error: "Student ID is required.",
//       };
//     }

//     const data = formDataToStudentData(formData);

//     const validation = validateStudentData(data);

//     if (!validation.valid) {
//       return {
//         success: false,
//         error: validation.error,
//       };
//     }

//     if (data.class_id) {
//       const { data: schoolClass, error: classError } = await context.client
//         .from("classes")
//         .select("id")
//         .eq("id", data.class_id)
//         .eq("school_id", context.schoolId)
//         .maybeSingle();

//       if (classError) {
//         console.error("Validate update class error:", classError);

//         return {
//           success: false,
//           error: "Unable to validate the selected class.",
//         };
//       }

//       if (!schoolClass) {
//         return {
//           success: false,
//           error: "The selected class does not belong to your school.",
//         };
//       }
//     }

//     let status: string;

//     if (data.status) {
//       status = data.status;
//     } else {
//       const { data: existingStudent, error: existingError } =
//         await context.client
//           .from("students")
//           .select("status")
//           .eq("id", studentId)
//           .eq("school_id", context.schoolId)
//           .maybeSingle();

//       if (existingError) {
//         console.error("Get existing student status error:", existingError);

//         return {
//           success: false,
//           error: "Unable to load the student's current status.",
//         };
//       }

//       if (!existingStudent) {
//         return {
//           success: false,
//           error: "Student not found.",
//         };
//       }

//       status = existingStudent.status;
//     }

//     const { data: student, error } = await context.client
//       .from("students")
//       .update({
//         first_name: validation.firstName,
//         last_name: validation.lastName,
//         student_id: validation.studentId,
//         gender: data.gender?.trim() || null,
//         date_of_birth: data.date_of_birth || null,
//         class_id: data.class_id || null,
//         phone: data.phone?.trim() || null,
//         address: data.address?.trim() || null,
//         status,
//         updated_at: new Date().toISOString(),
//       })
//       .eq("id", studentId)
//       .eq("school_id", context.schoolId)
//       .select()
//       .single();

//     if (error) {
//       console.error("Update student error:", error);

//       switch (error.code) {
//         case "23505":
//           return {
//             success: false,
//             error:
//               "A student with this student ID already exists in this school.",
//           };

//         case "23503":
//           return {
//             success: false,
//             error: "The selected class does not exist.",
//           };

//         case "42501":
//           return {
//             success: false,
//             error: "You do not have permission to update this student.",
//           };

//         case "PGRST116":
//           return {
//             success: false,
//             error: "Student not found.",
//           };

//         default:
//           return {
//             success: false,
//             error: error.message || "Failed to update student.",
//           };
//       }
//     }

//     revalidatePath("/school/students");
//     revalidatePath(`/school/students/${studentId}`);
//     revalidatePath(`/school/students/${studentId}/edit`);
//     revalidatePath("/school/dashboard");

//     if (requestedSchoolId) {
//       revalidatePath(`/platform/schools/${requestedSchoolId}`);
//       revalidatePath(`/platform/schools/${requestedSchoolId}/students`);
//     }

//     return {
//       success: true,
//       student,
//     };
//   } catch (error) {
//     console.error("Update student exception:", error);

//     return {
//       success: false,
//       error: "An unexpected error occurred while updating the student.",
//     };
//   }
// }

// /* =========================================================
//    TOGGLE STUDENT STATUS
// ========================================================= */

// export async function toggleStudentStatus(
//   studentId: string,
//   nextStatus: string,
//   schoolId?: string,
// ): Promise<ActionResult> {
//   try {
//     const context = await getStudentManagementContext(schoolId);

//     if (!context.success) {
//       return context;
//     }

//     if (!studentId) {
//       return {
//         success: false,
//         error: "Student ID is required.",
//       };
//     }

//     if (!["active", "inactive"].includes(nextStatus)) {
//       return {
//         success: false,
//         error: "Invalid student status.",
//       };
//     }

//     const { data: student, error } = await context.client
//       .from("students")
//       .update({
//         status: nextStatus,
//         updated_at: new Date().toISOString(),
//       })
//       .eq("id", studentId)
//       .eq("school_id", context.schoolId)
//       .select()
//       .single();

//     if (error) {
//       console.error("Toggle student status error:", error);

//       switch (error.code) {
//         case "42501":
//           return {
//             success: false,
//             error:
//               "You do not have permission to change this student's status.",
//           };

//         case "PGRST116":
//           return {
//             success: false,
//             error: "Student not found.",
//           };

//         default:
//           return {
//             success: false,
//             error: error.message || "Failed to update student status.",
//           };
//       }
//     }

//     revalidatePath("/school/students");
//     revalidatePath(`/school/students/${studentId}`);
//     revalidatePath("/school/dashboard");

//     if (schoolId) {
//       revalidatePath(`/platform/schools/${schoolId}`);
//       revalidatePath(`/platform/schools/${schoolId}/students`);
//     }

//     return {
//       success: true,
//       student,
//     };
//   } catch (error) {
//     console.error("Toggle student status exception:", error);

//     return {
//       success: false,
//       error: "An unexpected error occurred while changing student status.",
//     };
//   }
// }

// /* =========================================================
//    DELETE STUDENT
// ========================================================= */

// export async function deleteStudent(
//   studentId: string,
//   schoolId?: string,
// ): Promise<ActionResult> {
//   try {
//     const context = await getStudentManagementContext(schoolId);

//     if (!context.success) {
//       return context;
//     }

//     if (!studentId) {
//       return {
//         success: false,
//         error: "Student ID is required.",
//       };
//     }

//     const { error } = await context.client
//       .from("students")
//       .delete()
//       .eq("id", studentId)
//       .eq("school_id", context.schoolId);

//     if (error) {
//       console.error("Delete student error:", error);

//       if (error.code === "42501") {
//         return {
//           success: false,
//           error: "You do not have permission to delete this student.",
//         };
//       }

//       return {
//         success: false,
//         error: error.message || "Failed to delete student.",
//       };
//     }

//     revalidatePath("/school/students");
//     revalidatePath("/school/dashboard");

//     if (schoolId) {
//       revalidatePath(`/platform/schools/${schoolId}`);
//       revalidatePath(`/platform/schools/${schoolId}/students`);
//     }

//     return {
//       success: true,
//     };
//   } catch (error) {
//     console.error("Delete student exception:", error);

//     return {
//       success: false,
//       error: "An unexpected error occurred while deleting the student.",
//     };
//   }
// }

"use server";

import { revalidatePath } from "next/cache";

import { getManagementContext } from "@/lib/auth/get-management-context";

export type StudentFormData = {
  first_name: string;
  last_name: string;
  student_id: string;
  gender?: string | null;
  date_of_birth?: string | null;
  class_id?: string | null;
  phone?: string | null;
  address?: string | null;
  status?: string | null;
};

type ActionResult = {
  success: boolean;
  error?: string;
  student?: Record<string, unknown> | null;
};

function formDataToStudentData(formData: FormData): StudentFormData {
  return {
    first_name: String(formData.get("first_name") ?? ""),
    last_name: String(formData.get("last_name") ?? ""),
    student_id: String(formData.get("student_id") ?? ""),
    gender: String(formData.get("gender") ?? "") || null,
    date_of_birth: String(formData.get("date_of_birth") ?? "") || null,
    class_id: String(formData.get("class_id") ?? "") || null,
    phone: String(formData.get("phone") ?? "") || null,
    address: String(formData.get("address") ?? "") || null,
    status: String(formData.get("status") ?? "") || "active",
  };
}

function validateStudentData(data: StudentFormData) {
  const firstName = data.first_name.trim();
  const lastName = data.last_name.trim();
  const studentId = data.student_id.trim();

  if (!firstName) {
    return {
      valid: false as const,
      error: "First name is required.",
    };
  }

  if (!lastName) {
    return {
      valid: false as const,
      error: "Last name is required.",
    };
  }

  if (!studentId) {
    return {
      valid: false as const,
      error: "Student ID is required.",
    };
  }

  return {
    valid: true as const,
    firstName,
    lastName,
    studentId,
  };
}

/* =========================================================
   GET STUDENTS
========================================================= */

export async function getStudents(schoolId?: string | null) {
  try {
    const context = await getManagementContext(schoolId);

    if (!context) {
      return {
        success: false,
        error: "You are not authorized to access students.",
        students: [],
      };
    }

    const { data, error } = await context.client
      .from("students")
      .select("*")
      .eq("school_id", context.schoolId)
      .order("first_name", { ascending: true })
      .order("last_name", { ascending: true });

    if (error) {
      console.error("Get students error:", error);

      return {
        success: false,
        error: error.message || "Failed to load students.",
        students: [],
      };
    }

    return {
      success: true,
      students: data ?? [],
    };
  } catch (error) {
    console.error("Get students exception:", error);

    return {
      success: false,
      error: "An unexpected error occurred while loading students.",
      students: [],
    };
  }
}

/* =========================================================
   CREATE STUDENT
========================================================= */

export async function createStudent(formData: FormData): Promise<ActionResult> {
  try {
    const requestedSchoolId =
      String(formData.get("school_id") ?? "").trim() || null;

    const context = await getManagementContext(requestedSchoolId);

    if (!context) {
      return {
        success: false,
        error: "You are not authorized to create students.",
      };
    }

    if (context.role !== "school_admin" && context.role !== "super_admin") {
      return {
        success: false,
        error: "You are not authorized to create students.",
      };
    }

    const data = formDataToStudentData(formData);

    const validation = validateStudentData(data);

    if (!validation.valid) {
      return {
        success: false,
        error: validation.error,
      };
    }

    if (data.class_id) {
      const { data: schoolClass, error: classError } = await context.client
        .from("classes")
        .select("id")
        .eq("id", data.class_id)
        .eq("school_id", context.schoolId)
        .maybeSingle();

      if (classError) {
        console.error("Validate student class error:", classError);

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
    }

    const { data: student, error } = await context.client
      .from("students")
      .insert({
        school_id: context.schoolId,
        first_name: validation.firstName,
        last_name: validation.lastName,
        student_id: validation.studentId,
        gender: data.gender?.trim() || null,
        date_of_birth: data.date_of_birth || null,
        class_id: data.class_id || null,
        phone: data.phone?.trim() || null,
        address: data.address?.trim() || null,
        status: data.status || "active",
      })
      .select()
      .single();

    if (error) {
      console.error("Create student error:", error);

      if (error.code === "23505") {
        return {
          success: false,
          error:
            "A student with this student ID already exists in this school.",
        };
      }

      if (error.code === "23503") {
        return {
          success: false,
          error: "The selected class does not exist.",
        };
      }

      if (error.code === "42501") {
        return {
          success: false,
          error:
            "You do not have permission to create students in this school.",
        };
      }

      return {
        success: false,
        error: error.message || "Failed to create student.",
      };
    }

    revalidatePath("/school/students");
    revalidatePath("/school/dashboard");

    if (requestedSchoolId) {
      revalidatePath(`/platform/schools/${requestedSchoolId}`);
      revalidatePath(`/platform/schools/${requestedSchoolId}/students`);
    }

    return {
      success: true,
      student,
    };
  } catch (error) {
    console.error("Create student exception:", error);

    return {
      success: false,
      error: "An unexpected error occurred while creating the student.",
    };
  }
}

/* =========================================================
   UPDATE STUDENT
========================================================= */

export async function updateStudent(formData: FormData): Promise<ActionResult> {
  try {
    const requestedSchoolId =
      String(formData.get("school_id") ?? "").trim() || null;

    const context = await getManagementContext(requestedSchoolId);

    if (!context) {
      return {
        success: false,
        error: "You are not authorized to update students.",
      };
    }

    if (context.role !== "school_admin" && context.role !== "super_admin") {
      return {
        success: false,
        error: "You are not authorized to update students.",
      };
    }

    const studentId = String(formData.get("id") ?? "").trim();

    if (!studentId) {
      return {
        success: false,
        error: "Student ID is required.",
      };
    }

    const data = formDataToStudentData(formData);

    const validation = validateStudentData(data);

    if (!validation.valid) {
      return {
        success: false,
        error: validation.error,
      };
    }

    if (data.class_id) {
      const { data: schoolClass, error: classError } = await context.client
        .from("classes")
        .select("id")
        .eq("id", data.class_id)
        .eq("school_id", context.schoolId)
        .maybeSingle();

      if (classError) {
        console.error("Validate update class error:", classError);

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
    }

    let status: string;

    if (data.status) {
      status = data.status;
    } else {
      const { data: existingStudent, error: existingError } =
        await context.client
          .from("students")
          .select("status")
          .eq("id", studentId)
          .eq("school_id", context.schoolId)
          .maybeSingle();

      if (existingError) {
        console.error("Get existing student status error:", existingError);

        return {
          success: false,
          error: "Unable to load the student's current status.",
        };
      }

      if (!existingStudent) {
        return {
          success: false,
          error: "Student not found.",
        };
      }

      status = existingStudent.status;
    }

    const { data: student, error } = await context.client
      .from("students")
      .update({
        first_name: validation.firstName,
        last_name: validation.lastName,
        student_id: validation.studentId,
        gender: data.gender?.trim() || null,
        date_of_birth: data.date_of_birth || null,
        class_id: data.class_id || null,
        phone: data.phone?.trim() || null,
        address: data.address?.trim() || null,
        status,
        updated_at: new Date().toISOString(),
      })
      .eq("id", studentId)
      .eq("school_id", context.schoolId)
      .select()
      .single();

    if (error) {
      console.error("Update student error:", error);

      if (error.code === "23505") {
        return {
          success: false,
          error:
            "A student with this student ID already exists in this school.",
        };
      }

      if (error.code === "23503") {
        return {
          success: false,
          error: "The selected class does not exist.",
        };
      }

      if (error.code === "42501") {
        return {
          success: false,
          error: "You do not have permission to update this student.",
        };
      }

      if (error.code === "PGRST116") {
        return {
          success: false,
          error: "Student not found.",
        };
      }

      return {
        success: false,
        error: error.message || "Failed to update student.",
      };
    }

    revalidatePath("/school/students");
    revalidatePath(`/school/students/${studentId}`);
    revalidatePath(`/school/students/${studentId}/edit`);
    revalidatePath("/school/dashboard");

    if (requestedSchoolId) {
      revalidatePath(`/platform/schools/${requestedSchoolId}`);
      revalidatePath(`/platform/schools/${requestedSchoolId}/students`);
    }

    return {
      success: true,
      student,
    };
  } catch (error) {
    console.error("Update student exception:", error);

    return {
      success: false,
      error: "An unexpected error occurred while updating the student.",
    };
  }
}

/* =========================================================
   TOGGLE STUDENT STATUS
========================================================= */

export async function toggleStudentStatus(
  studentId: string,
  nextStatus: string,
  schoolId?: string,
): Promise<ActionResult> {
  try {
    const context = await getManagementContext(schoolId);

    if (!context) {
      return {
        success: false,
        error: "You are not authorized to change student status.",
      };
    }

    if (context.role !== "school_admin" && context.role !== "super_admin") {
      return {
        success: false,
        error: "You are not authorized to change student status.",
      };
    }

    if (!studentId) {
      return {
        success: false,
        error: "Student ID is required.",
      };
    }

    if (!["active", "inactive"].includes(nextStatus)) {
      return {
        success: false,
        error: "Invalid student status.",
      };
    }

    const { data: student, error } = await context.client
      .from("students")
      .update({
        status: nextStatus,
        updated_at: new Date().toISOString(),
      })
      .eq("id", studentId)
      .eq("school_id", context.schoolId)
      .select()
      .single();

    if (error) {
      console.error("Toggle student status error:", error);

      if (error.code === "42501") {
        return {
          success: false,
          error: "You do not have permission to change this student's status.",
        };
      }

      if (error.code === "PGRST116") {
        return {
          success: false,
          error: "Student not found.",
        };
      }

      return {
        success: false,
        error: error.message || "Failed to update student status.",
      };
    }

    revalidatePath("/school/students");
    revalidatePath(`/school/students/${studentId}`);
    revalidatePath("/school/dashboard");

    if (schoolId) {
      revalidatePath(`/platform/schools/${schoolId}`);
      revalidatePath(`/platform/schools/${schoolId}/students`);
    }

    return {
      success: true,
      student,
    };
  } catch (error) {
    console.error("Toggle student status exception:", error);

    return {
      success: false,
      error: "An unexpected error occurred while changing student status.",
    };
  }
}

/* =========================================================
   DELETE STUDENT
========================================================= */

export async function deleteStudent(
  studentId: string,
  schoolId?: string,
): Promise<ActionResult> {
  try {
    const context = await getManagementContext(schoolId);

    if (!context) {
      return {
        success: false,
        error: "You are not authorized to delete students.",
      };
    }

    if (context.role !== "school_admin" && context.role !== "super_admin") {
      return {
        success: false,
        error: "You are not authorized to delete students.",
      };
    }

    if (!studentId) {
      return {
        success: false,
        error: "Student ID is required.",
      };
    }

    const { error } = await context.client
      .from("students")
      .delete()
      .eq("id", studentId)
      .eq("school_id", context.schoolId);

    if (error) {
      console.error("Delete student error:", error);

      if (error.code === "42501") {
        return {
          success: false,
          error: "You do not have permission to delete this student.",
        };
      }

      return {
        success: false,
        error: error.message || "Failed to delete student.",
      };
    }

    revalidatePath("/school/students");
    revalidatePath("/school/dashboard");

    if (schoolId) {
      revalidatePath(`/platform/schools/${schoolId}`);
      revalidatePath(`/platform/schools/${schoolId}/students`);
    }

    return {
      success: true,
    };
  } catch (error) {
    console.error("Delete student exception:", error);

    return {
      success: false,
      error: "An unexpected error occurred while deleting the student.",
    };
  }
}