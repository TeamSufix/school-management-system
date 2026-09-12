// "use server";

// import { revalidatePath } from "next/cache";

// import { getManagementContext } from "@/lib/auth/get-management-context";
// import { calculateGrade } from "@/lib/academics/grades";

// export type ResultRecord = {
//   student_id: string;
//   class_id: string;
//   subject_id: string;
//   academic_year: string;
//   term: "term_1" | "term_2" | "term_3";
//   score: number;
// };

// export type ResultAmendmentRecord = {
//   result_id: string;
//   new_score: number;
//   reason: string;
// };

// /* =========================================================
//    GET RESULTS
// ========================================================= */

// export async function getResults(
//   classId: string,
//   subjectId: string,
//   academicYear: string,
//   term: "term_1" | "term_2" | "term_3",
//   schoolId?: string,
// ) {
//   try {
//     const context = await getManagementContext(schoolId);

//     if (!context) {
//       return {
//         success: false,
//         error: "You are not authorized to access this school.",
//       };
//     }

//     const { data: results, error } = await context.client
//       .from("results")
//       .select(
//         `
//         id,
//         student_id,
//         class_id,
//         subject_id,
//         academic_year,
//         term,
//         score,
//         grade,
//         created_at
//       `,
//       )
//       .eq("school_id", context.schoolId)
//       .eq("class_id", classId)
//       .eq("subject_id", subjectId)
//       .eq("academic_year", academicYear)
//       .eq("term", term)
//       .order("created_at", { ascending: true });

//     if (error) {
//       console.error("Get results error:", error);

//       return {
//         success: false,
//         error: error.message || "Failed to load results.",
//       };
//     }

//     const resultIds = (results ?? []).map((result) => result.id);

//     let amendments: Array<{
//       id: string;
//       result_id: string;
//       old_score: number;
//       new_score: number;
//       old_grade: string;
//       new_grade: string;
//       reason: string;
//       amended_by: string;
//       created_at: string;
//     }> = [];

//     if (resultIds.length) {
//       const { data: amendmentData, error: amendmentError } =
//         await context.client
//           .from("result_amendments")
//           .select(
//             `
//             id,
//             result_id,
//             old_score,
//             new_score,
//             old_grade,
//             new_grade,
//             reason,
//             amended_by,
//             created_at
//           `,
//           )
//           .eq("school_id", context.schoolId)
//           .in("result_id", resultIds)
//           .order("created_at", {
//             ascending: true,
//           });

//       if (amendmentError) {
//         console.error("Get result amendments error:", amendmentError);

//         return {
//           success: false,
//           error: amendmentError.message || "Failed to load result amendments.",
//         };
//       }

//       amendments = amendmentData ?? [];
//     }

//     const enrichedResults = (results ?? []).map((result) => {
//       const resultAmendments = amendments.filter(
//         (amendment) => amendment.result_id === result.id,
//       );

//       const latestAmendment = resultAmendments.length
//         ? resultAmendments[resultAmendments.length - 1]
//         : null;

//       return {
//         ...result,
//         original_score: Number(result.score),
//         original_grade: result.grade,
//         current_score: latestAmendment
//           ? Number(latestAmendment.new_score)
//           : Number(result.score),
//         current_grade: latestAmendment
//           ? latestAmendment.new_grade
//           : result.grade,
//         amendments: resultAmendments,
//       };
//     });

//     return {
//       success: true,
//       results: enrichedResults,
//     };
//   } catch (error) {
//     console.error("Get results exception:", error);

//     return {
//       success: false,
//       error: "An unexpected error occurred.",
//     };
//   }
// }

// /* =========================================================
//    GET RESULT STUDENTS
// ========================================================= */

// export async function getResultStudents(classId: string, schoolId?: string) {
//   try {
//     if (!classId) {
//       return {
//         success: false,
//         error: "Class is required.",
//       };
//     }

//     const context = await getManagementContext(schoolId);

//     if (!context) {
//       return {
//         success: false,
//         error: "You are not authorized to access this school.",
//       };
//     }

//     const { data, error } = await context.client
//       .from("students")
//       .select(
//         `
//         id,
//         first_name,
//         last_name,
//         student_id,
//         class_id,
//         status
//       `,
//       )
//       .eq("school_id", context.schoolId)
//       .eq("class_id", classId)
//       .eq("status", "active")
//       .order("first_name", { ascending: true })
//       .order("last_name", { ascending: true });

//     if (error) {
//       console.error("Get result students error:", error);

//       return {
//         success: false,
//         error: error.message || "Failed to load students.",
//       };
//     }

//     return {
//       success: true,
//       students: data ?? [],
//     };
//   } catch (error) {
//     console.error("Get result students exception:", error);

//     return {
//       success: false,
//       error: "An unexpected error occurred.",
//     };
//   }
// }

// /* =========================================================
//    SAVE RESULTS
// ========================================================= */

// export async function saveResults(records: ResultRecord[], schoolId?: string) {
//   try {
//     if (!records.length) {
//       return {
//         success: false,
//         error: "No results were provided.",
//       };
//     }

//     const context = await getManagementContext(schoolId);

//     if (!context) {
//       return {
//         success: false,
//         error: "You are not authorized to save results.",
//       };
//     }

//     if (
//       context.role !== "school_admin" &&
//       context.role !== "teacher" &&
//       context.role !== "super_admin"
//     ) {
//       return {
//         success: false,
//         error: "You are not authorized to save results.",
//       };
//     }

//     for (const record of records) {
//       if (!record.student_id) {
//         return {
//           success: false,
//           error: "A student is missing from the results.",
//         };
//       }

//       if (!record.class_id) {
//         return {
//           success: false,
//           error: "Class is required.",
//         };
//       }

//       if (!record.subject_id) {
//         return {
//           success: false,
//           error: "Subject is required.",
//         };
//       }

//       if (!record.academic_year) {
//         return {
//           success: false,
//           error: "Academic year is required.",
//         };
//       }

//       if (!["term_1", "term_2", "term_3"].includes(record.term)) {
//         return {
//           success: false,
//           error: "Invalid term.",
//         };
//       }

//       if (
//         Number.isNaN(record.score) ||
//         record.score < 0 ||
//         record.score > 100
//       ) {
//         return {
//           success: false,
//           error: "Scores must be between 0 and 100.",
//         };
//       }
//     }

//     const rows = records.map((record) => ({
//       school_id: context.schoolId,
//       student_id: record.student_id,
//       class_id: record.class_id,
//       subject_id: record.subject_id,
//       academic_year: record.academic_year,
//       term: record.term,
//       score: record.score,
//       grade: calculateGrade(record.score),
//     }));

//     /*
//      * INSERT ONLY.
//      *
//      * Never upsert.
//      *
//      * Once a result exists, another save produces a
//      * duplicate-key error instead of modifying it.
//      */
//     const { data, error } = await context.client
//       .from("results")
//       .insert(rows)
//       .select();

//     if (error) {
//       console.error("Save results error:", error);

//       if (error.code === "23505") {
//         return {
//           success: false,
//           error:
//             "A result has already been recorded for one or more students. Recorded results cannot be changed. Use Amend Result instead.",
//         };
//       }

//       if (error.code === "42501") {
//         return {
//           success: false,
//           error: "You do not have permission to save results.",
//         };
//       }

//       return {
//         success: false,
//         error: error.message || "Failed to save results.",
//       };
//     }

//     revalidatePath("/school/results");
//     revalidatePath("/school/dashboard");

//     if (schoolId) {
//       revalidatePath(`/platform/schools/${schoolId}`);
//     }

//     return {
//       success: true,
//       results: data ?? [],
//     };
//   } catch (error) {
//     console.error("Save results exception:", error);

//     return {
//       success: false,
//       error: "An unexpected error occurred while saving results.",
//     };
//   }
// }

// /* =========================================================
//    AMEND RESULT
// ========================================================= */

// export async function amendResult(
//   record: ResultAmendmentRecord,
//   schoolId?: string,
// ) {
//   try {
//     if (!record.result_id) {
//       return {
//         success: false,
//         error: "Result ID is required.",
//       };
//     }

//     if (
//       !Number.isFinite(record.new_score) ||
//       record.new_score < 0 ||
//       record.new_score > 100
//     ) {
//       return {
//         success: false,
//         error: "The amended score must be between 0 and 100.",
//       };
//     }

//     const reason = record.reason.trim();

//     if (!reason) {
//       return {
//         success: false,
//         error: "An amendment reason is required.",
//       };
//     }

//     const context = await getManagementContext(schoolId);

//     if (!context) {
//       return {
//         success: false,
//         error: "You are not authorized to amend results.",
//       };
//     }

//     if (context.role !== "school_admin" && context.role !== "super_admin") {
//       return {
//         success: false,
//         error:
//           "Only a school administrator or super administrator can amend results.",
//       };
//     }

//     const { data: userData } = await context.client.auth.getUser();

//     if (!userData.user) {
//       return {
//         success: false,
//         error: "You must be logged in.",
//       };
//     }

//     /*
//      * Fetch the immutable original result.
//      */
//     const { data: result, error: resultError } = await context.client
//       .from("results")
//       .select(
//         `
//           id,
//           school_id,
//           score,
//           grade
//         `,
//       )
//       .eq("id", record.result_id)
//       .eq("school_id", context.schoolId)
//       .maybeSingle();

//     if (resultError) {
//       console.error("Get result for amendment error:", resultError);

//       return {
//         success: false,
//         error: "Unable to load the selected result.",
//       };
//     }

//     if (!result) {
//       return {
//         success: false,
//         error: "Result not found.",
//       };
//     }

//     /*
//      * Determine the current effective score.
//      *
//      * If previous amendments exist, amend from the latest
//      * effective value, while preserving every historical step.
//      */
//     const { data: previousAmendments, error: amendmentsError } =
//       await context.client
//         .from("result_amendments")
//         .select(
//           `
//           new_score,
//           new_grade,
//           created_at
//         `,
//         )
//         .eq("result_id", result.id)
//         .eq("school_id", context.schoolId)
//         .order("created_at", {
//           ascending: false,
//         })
//         .limit(1);

//     if (amendmentsError) {
//       console.error("Get previous result amendment error:", amendmentsError);

//       return {
//         success: false,
//         error: "Unable to determine the current result.",
//       };
//     }

//     const latest = previousAmendments?.[0] ?? null;

//     const oldScore = latest ? Number(latest.new_score) : Number(result.score);

//     const oldGrade = latest ? latest.new_grade : result.grade;

//     const newGrade = calculateGrade(record.new_score);

//     if (oldScore === record.new_score) {
//       return {
//         success: false,
//         error: "The amended score is the same as the current score.",
//       };
//     }

//     /*
//      * IMPORTANT:
//      *
//      * We do NOT update results.
//      *
//      * We append an amendment record.
//      */
//     const { data: amendment, error } = await context.client
//       .from("result_amendments")
//       .insert({
//         school_id: context.schoolId,
//         result_id: result.id,
//         old_score: oldScore,
//         new_score: record.new_score,
//         old_grade: oldGrade,
//         new_grade: newGrade,
//         reason,
//         amended_by: userData.user.id,
//       })
//       .select()
//       .single();

//     if (error) {
//       console.error("Create result amendment error:", error);

//       if (error.code === "42501") {
//         return {
//           success: false,
//           error: "You do not have permission to amend this result.",
//         };
//       }

//       return {
//         success: false,
//         error: error.message || "Failed to amend result.",
//       };
//     }

//     revalidatePath("/school/results");
//     revalidatePath("/school/dashboard");

//     if (schoolId) {
//       revalidatePath(`/platform/schools/${schoolId}`);
//     }

//     return {
//       success: true,
//       amendment,
//     };
//   } catch (error) {
//     console.error("Amend result exception:", error);

//     return {
//       success: false,
//       error: "An unexpected error occurred while amending the result.",
//     };
//   }
// }

// export async function getResultsHistory(schoolId?: string) {
//   try {
//     const context = await getManagementContext(schoolId);

//     if (!context) {
//       return {
//         success: false,
//         error: "You are not authorized to access this school.",
//       };
//     }

//     const { data: results, error } = await context.client
//       .from("results")
//       .select(
//         `
//         id,
//         student_id,
//         class_id,
//         subject_id,
//         academic_year,
//         term,
//         score,
//         grade,
//         created_at
//       `,
//       )
//       .eq("school_id", context.schoolId)
//       .order("created_at", {
//         ascending: false,
//       });

//     if (error) {
//       console.error("Get results history error:", error);

//       return {
//         success: false,
//         error: error.message || "Failed to load result history.",
//       };
//     }

//     const records = results ?? [];

//     if (!records.length) {
//       return {
//         success: true,
//         results: [],
//       };
//     }

//     const studentIds = [...new Set(records.map((record) => record.student_id))];

//     const classIds = [...new Set(records.map((record) => record.class_id))];

//     const subjectIds = [...new Set(records.map((record) => record.subject_id))];

//     const [{ data: students }, { data: classes }, { data: subjects }] =
//       await Promise.all([
//         context.client
//           .from("students")
//           .select(
//             `
//           id,
//           first_name,
//           last_name,
//           student_id
//         `,
//           )
//           .eq("school_id", context.schoolId)
//           .in("id", studentIds),

//         context.client
//           .from("classes")
//           .select(
//             `
//           id,
//           name
//         `,
//           )
//           .eq("school_id", context.schoolId)
//           .in("id", classIds),

//         context.client
//           .from("subjects")
//           .select(
//             `
//           id,
//           name
//         `,
//           )
//           .eq("school_id", context.schoolId)
//           .in("id", subjectIds),
//       ]);

//     const studentMap = new Map(
//       (students ?? []).map((student) => [student.id, student]),
//     );

//     const classMap = new Map(
//       (classes ?? []).map((schoolClass) => [schoolClass.id, schoolClass]),
//     );

//     const subjectMap = new Map(
//       (subjects ?? []).map((subject) => [subject.id, subject]),
//     );

//     return {
//       success: true,
//       results: records.map((record) => ({
//         ...record,
//         score: Number(record.score),
//         student: studentMap.get(record.student_id) ?? null,
//         class: classMap.get(record.class_id) ?? null,
//         subject: subjectMap.get(record.subject_id) ?? null,
//       })),
//     };
//   } catch (error) {
//     console.error("Get results history exception:", error);

//     return {
//       success: false,
//       error: "An unexpected error occurred.",
//     };
//   }
// }

"use server";

import { revalidatePath } from "next/cache";

import { getManagementContext } from "@/lib/auth/get-management-context";
import { calculateGrade } from "@/lib/academics/grades";

export type ResultRecord = {
  student_id: string;
  class_id: string;
  subject_id: string;
  academic_year: string;
  term: "term_1" | "term_2" | "term_3";
  score: number;
};

export type ResultAmendmentRecord = {
  result_id: string;
  new_score: number;
  reason: string;
};

function canViewResults(role: string) {
  return (
    role === "super_admin" || role === "school_admin" || role === "teacher"
  );
}

function canSaveResults(role: string) {
  return (
    role === "super_admin" || role === "school_admin" || role === "teacher"
  );
}

function canAmendResults(role: string) {
  return role === "super_admin" || role === "school_admin";
}

/* =========================================================
   GET RESULTS
========================================================= */

export async function getResults(
  classId: string,
  subjectId: string,
  academicYear: string,
  term: "term_1" | "term_2" | "term_3",
  schoolId?: string,
) {
  try {
    if (!classId || !subjectId || !academicYear || !term) {
      return {
        success: false,
        error: "Class, subject, academic year and term are required.",
      };
    }

    const context = await getManagementContext(schoolId);

    if (!context) {
      return {
        success: false,
        error: "You are not authorized to access results.",
      };
    }

    if (!canViewResults(context.role)) {
      return {
        success: false,
        error: "You are not authorized to access results.",
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

    const { data: subject, error: subjectError } = await context.client
      .from("subjects")
      .select("id")
      .eq("id", subjectId)
      .eq("school_id", context.schoolId)
      .maybeSingle();

    if (subjectError || !subject) {
      return {
        success: false,
        error: "The selected subject does not belong to this school.",
      };
    }

    const { data: results, error } = await context.client
      .from("results")
      .select(
        `
        id,
        student_id,
        class_id,
        subject_id,
        academic_year,
        term,
        score,
        grade,
        created_at
      `,
      )
      .eq("school_id", context.schoolId)
      .eq("class_id", classId)
      .eq("subject_id", subjectId)
      .eq("academic_year", academicYear)
      .eq("term", term)
      .order("created_at", {
        ascending: true,
      });

    if (error) {
      console.error("Get results error:", error);

      return {
        success: false,
        error: error.message || "Failed to load results.",
      };
    }

    const resultIds = (results ?? []).map((result) => result.id);

    let amendments: Array<{
      id: string;
      result_id: string;
      old_score: number;
      new_score: number;
      old_grade: string;
      new_grade: string;
      reason: string;
      amended_by: string;
      created_at: string;
    }> = [];

    if (resultIds.length) {
      const { data: amendmentData, error: amendmentError } =
        await context.client
          .from("result_amendments")
          .select(
            `
            id,
            result_id,
            old_score,
            new_score,
            old_grade,
            new_grade,
            reason,
            amended_by,
            created_at
          `,
          )
          .eq("school_id", context.schoolId)
          .in("result_id", resultIds)
          .order("created_at", {
            ascending: true,
          });

      if (amendmentError) {
        console.error("Get result amendments error:", amendmentError);

        return {
          success: false,
          error: amendmentError.message || "Failed to load result amendments.",
        };
      }

      amendments = amendmentData ?? [];
    }

    const enrichedResults = (results ?? []).map((result) => {
      const resultAmendments = amendments.filter(
        (amendment) => amendment.result_id === result.id,
      );

      const latestAmendment = resultAmendments.length
        ? resultAmendments[resultAmendments.length - 1]
        : null;

      return {
        ...result,
        original_score: Number(result.score),
        original_grade: result.grade,
        current_score: latestAmendment
          ? Number(latestAmendment.new_score)
          : Number(result.score),
        current_grade: latestAmendment
          ? latestAmendment.new_grade
          : result.grade,
        amendments: resultAmendments,
      };
    });

    return {
      success: true,
      results: enrichedResults,
    };
  } catch (error) {
    console.error("Get results exception:", error);

    return {
      success: false,
      error: "An unexpected error occurred.",
    };
  }
}

/* =========================================================
   GET RESULT STUDENTS
========================================================= */

export async function getResultStudents(classId: string, schoolId?: string) {
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
        error: "You are not authorized to access results.",
      };
    }

    if (!canViewResults(context.role)) {
      return {
        success: false,
        error: "You are not authorized to access results.",
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
      console.error("Get result students error:", error);

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
    console.error("Get result students exception:", error);

    return {
      success: false,
      error: "An unexpected error occurred.",
    };
  }
}

/* =========================================================
   SAVE RESULTS
========================================================= */

export async function saveResults(records: ResultRecord[], schoolId?: string) {
  try {
    if (!records.length) {
      return {
        success: false,
        error: "No results were provided.",
      };
    }

    const context = await getManagementContext(schoolId);

    if (!context) {
      return {
        success: false,
        error: "You are not authorized to save results.",
      };
    }

    if (!canSaveResults(context.role)) {
      return {
        success: false,
        error: "You are not authorized to save results.",
      };
    }

    for (const record of records) {
      if (!record.student_id) {
        return {
          success: false,
          error: "A student is missing from the results.",
        };
      }

      if (!record.class_id) {
        return {
          success: false,
          error: "Class is required.",
        };
      }

      if (!record.subject_id) {
        return {
          success: false,
          error: "Subject is required.",
        };
      }

      if (!record.academic_year) {
        return {
          success: false,
          error: "Academic year is required.",
        };
      }

      if (!["term_1", "term_2", "term_3"].includes(record.term)) {
        return {
          success: false,
          error: "Invalid term.",
        };
      }

      if (
        !Number.isFinite(record.score) ||
        record.score < 0 ||
        record.score > 100
      ) {
        return {
          success: false,
          error: "Scores must be between 0 and 100.",
        };
      }
    }

    const classIds = [...new Set(records.map((record) => record.class_id))];

    const subjectIds = [...new Set(records.map((record) => record.subject_id))];

    if (classIds.length !== 1) {
      return {
        success: false,
        error: "Results must belong to one class.",
      };
    }

    if (subjectIds.length !== 1) {
      return {
        success: false,
        error: "Results must belong to one subject.",
      };
    }

    const classId = classIds[0];
    const subjectId = subjectIds[0];

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

    const { data: subject, error: subjectError } = await context.client
      .from("subjects")
      .select("id")
      .eq("id", subjectId)
      .eq("school_id", context.schoolId)
      .maybeSingle();

    if (subjectError || !subject) {
      return {
        success: false,
        error: "The selected subject does not belong to this school.",
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
      console.error("Validate result students error:", studentsError);

      return {
        success: false,
        error: "Unable to validate the selected students.",
      };
    }

    if (!students || students.length !== studentIds.length) {
      return {
        success: false,
        error: "One or more students do not belong to this class.",
      };
    }

    const rows = records.map((record) => ({
      school_id: context.schoolId,
      student_id: record.student_id,
      class_id: record.class_id,
      subject_id: record.subject_id,
      academic_year: record.academic_year,
      term: record.term,
      score: record.score,
      grade: calculateGrade(record.score),
    }));

    const { data, error } = await context.client
      .from("results")
      .insert(rows)
      .select();

    if (error) {
      console.error("Save results error:", error);

      if (error.code === "23505") {
        return {
          success: false,
          error:
            "A result has already been recorded for one or more students. Use Amend Result instead.",
        };
      }

      if (error.code === "42501") {
        return {
          success: false,
          error: "You do not have permission to save results.",
        };
      }

      return {
        success: false,
        error: error.message || "Failed to save results.",
      };
    }

    revalidatePath("/school/results");
    revalidatePath("/school/dashboard");

    if (schoolId) {
      revalidatePath(`/platform/schools/${schoolId}`);
      revalidatePath(`/platform/schools/${schoolId}/results`);
    }

    return {
      success: true,
      results: data ?? [],
    };
  } catch (error) {
    console.error("Save results exception:", error);

    return {
      success: false,
      error: "An unexpected error occurred while saving results.",
    };
  }
}

/* =========================================================
   AMEND RESULT
========================================================= */

export async function amendResult(
  record: ResultAmendmentRecord,
  schoolId?: string,
) {
  try {
    if (!record.result_id) {
      return {
        success: false,
        error: "Result ID is required.",
      };
    }

    if (
      !Number.isFinite(record.new_score) ||
      record.new_score < 0 ||
      record.new_score > 100
    ) {
      return {
        success: false,
        error: "The amended score must be between 0 and 100.",
      };
    }

    const reason = record.reason.trim();

    if (!reason) {
      return {
        success: false,
        error: "An amendment reason is required.",
      };
    }

    const context = await getManagementContext(schoolId);

    if (!context) {
      return {
        success: false,
        error: "You are not authorized to amend results.",
      };
    }

    if (!canAmendResults(context.role)) {
      return {
        success: false,
        error:
          "Only a school administrator or super administrator can amend results.",
      };
    }

    const { data: userData } = await context.client.auth.getUser();

    if (!userData.user) {
      return {
        success: false,
        error: "You must be logged in.",
      };
    }

    const { data: result, error: resultError } = await context.client
      .from("results")
      .select(
        `
          id,
          school_id,
          score,
          grade
        `,
      )
      .eq("id", record.result_id)
      .eq("school_id", context.schoolId)
      .maybeSingle();

    if (resultError) {
      console.error("Get result for amendment error:", resultError);

      return {
        success: false,
        error: "Unable to load the selected result.",
      };
    }

    if (!result) {
      return {
        success: false,
        error: "Result not found.",
      };
    }

    const { data: previousAmendments, error: amendmentsError } =
      await context.client
        .from("result_amendments")
        .select(
          `
        new_score,
        new_grade,
        created_at
      `,
        )
        .eq("result_id", result.id)
        .eq("school_id", context.schoolId)
        .order("created_at", {
          ascending: false,
        })
        .limit(1);

    if (amendmentsError) {
      console.error("Get previous result amendment error:", amendmentsError);

      return {
        success: false,
        error: "Unable to determine the current result.",
      };
    }

    const latest = previousAmendments?.[0] ?? null;

    const oldScore = latest ? Number(latest.new_score) : Number(result.score);

    const oldGrade = latest ? latest.new_grade : result.grade;

    const newGrade = calculateGrade(record.new_score);

    if (oldScore === record.new_score) {
      return {
        success: false,
        error: "The amended score is the same as the current score.",
      };
    }

    const { data: amendment, error } = await context.client
      .from("result_amendments")
      .insert({
        school_id: context.schoolId,
        result_id: result.id,
        old_score: oldScore,
        new_score: record.new_score,
        old_grade: oldGrade,
        new_grade: newGrade,
        reason,
        amended_by: userData.user.id,
      })
      .select()
      .single();

    if (error) {
      console.error("Create result amendment error:", error);

      if (error.code === "42501") {
        return {
          success: false,
          error: "You do not have permission to amend this result.",
        };
      }

      return {
        success: false,
        error: error.message || "Failed to amend result.",
      };
    }

    revalidatePath("/school/results");
    revalidatePath("/school/dashboard");

    if (schoolId) {
      revalidatePath(`/platform/schools/${schoolId}`);
      revalidatePath(`/platform/schools/${schoolId}/results`);
    }

    return {
      success: true,
      amendment,
    };
  } catch (error) {
    console.error("Amend result exception:", error);

    return {
      success: false,
      error: "An unexpected error occurred while amending the result.",
    };
  }
}

/* =========================================================
   GET RESULTS HISTORY
========================================================= */

export async function getResultsHistory(schoolId?: string) {
  try {
    const context = await getManagementContext(schoolId);

    if (!context) {
      return {
        success: false,
        error: "You are not authorized to access results.",
      };
    }

    if (!canViewResults(context.role)) {
      return {
        success: false,
        error: "You are not authorized to access results.",
      };
    }

    const { data: results, error } = await context.client
      .from("results")
      .select(
        `
          id,
          student_id,
          class_id,
          subject_id,
          academic_year,
          term,
          score,
          grade,
          created_at
        `,
      )
      .eq("school_id", context.schoolId)
      .order("created_at", {
        ascending: false,
      });

    if (error) {
      console.error("Get results history error:", error);

      return {
        success: false,
        error: error.message || "Failed to load result history.",
      };
    }

    const records = results ?? [];

    if (!records.length) {
      return {
        success: true,
        results: [],
      };
    }

    const studentIds = [...new Set(records.map((record) => record.student_id))];

    const classIds = [...new Set(records.map((record) => record.class_id))];

    const subjectIds = [...new Set(records.map((record) => record.subject_id))];

    const [{ data: students }, { data: classes }, { data: subjects }] =
      await Promise.all([
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

        context.client
          .from("subjects")
          .select(
            `
          id,
          name
        `,
          )
          .eq("school_id", context.schoolId)
          .in("id", subjectIds),
      ]);

    const studentMap = new Map(
      (students ?? []).map((student) => [student.id, student]),
    );

    const classMap = new Map(
      (classes ?? []).map((schoolClass) => [schoolClass.id, schoolClass]),
    );

    const subjectMap = new Map(
      (subjects ?? []).map((subject) => [subject.id, subject]),
    );

    return {
      success: true,
      results: records.map((record) => ({
        ...record,
        score: Number(record.score),
        student: studentMap.get(record.student_id) ?? null,
        class: classMap.get(record.class_id) ?? null,
        subject: subjectMap.get(record.subject_id) ?? null,
      })),
    };
  } catch (error) {
    console.error("Get results history exception:", error);

    return {
      success: false,
      error: "An unexpected error occurred.",
    };
  }
}