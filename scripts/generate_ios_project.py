#!/usr/bin/env python3
"""Kyusei.xcodeproj を生成する。

xcodegen などの外部ツールに頼らず、この一本で project.pbxproj を書き出す。
この Mac は Ruby 2.6 で、Xcode 26 からそのヘッダが無くなったため CocoaPods を
入れられない。外の道具に頼らないのはそのためでもある。

    python3 scripts/generate_ios_project.py

構え:

    Kyusei.app
      web/            同梱した鑑定アプリ（HTML/CSS/JS/icons）
                      copy_web.sh が組み立てのたびに写す

ソースを足したら SOURCES を直して再実行する。
"""

from __future__ import annotations

import hashlib
from pathlib import Path

ROOT = Path(__file__).resolve().parent.parent
IOS = ROOT / "ios"
PROJECT_NAME = "Kyusei"
BUNDLE_ID = "jp.myodenji.kyusei"
DISPLAY_NAME = "九星鑑定"
IOS_DEPLOYMENT_TARGET = "17.0"
SWIFT_VERSION = "5.0"
DEVELOPMENT_TEAM = "P7442B37HP"

SOURCES = [
    "ios/Kyusei/KyuseiApp.swift",
    "ios/Kyusei/WebHost.swift",
    "ios/Kyusei/AppLock.swift",
    "ios/Kyusei/SelfCheck.swift",
]

RESOURCES = [
    "ios/Kyusei/Assets.xcassets",
    "ios/Kyusei/PrivacyInfo.xcprivacy",
]

PLIST = "ios/Kyusei/Info.plist"

# 鑑定アプリの中身は、組み立てのたびに写す。ここに一覧を持たない。
# 一覧を持つと、web 側にファイルが増えたときに必ず取りこぼす。
COPY_WEB_SCRIPT = "ios/copy_web.sh"

ALL_FILES = sorted(set(SOURCES + RESOURCES + [PLIST]))

# ---------------------------------------------------------------- ID

_used: set[str] = set()


def oid(*parts: str) -> str:
    """pbxproj の 24桁16進 ID。同じ入力からは常に同じ ID を返す。"""
    base = hashlib.md5("::".join(parts).encode("utf-8")).hexdigest()[:24].upper()
    out, salt = base, 0
    while out in _used:
        salt += 1
        out = hashlib.md5(f"{base}:{salt}".encode()).hexdigest()[:24].upper()
    _used.add(out)
    return out


PROJECT_ID = oid("project")
MAIN_GROUP = oid("group", "main")
PRODUCTS_GROUP = oid("group", "products")
TARGET_ID = oid("target")
PRODUCT_ID = oid("product")
PROJECT_CONFIGS = oid("configlist", "project")
TARGET_CONFIGS = oid("configlist", "target")
P_DEBUG, P_RELEASE = oid("config", "p", "Debug"), oid("config", "p", "Release")
T_DEBUG, T_RELEASE = oid("config", "t", "Debug"), oid("config", "t", "Release")
SOURCES_PHASE = oid("phase", "sources")
RESOURCES_PHASE = oid("phase", "resources")
FRAMEWORKS_PHASE = oid("phase", "frameworks")
WEB_PHASE = oid("phase", "web")

FILE_REFS = {p: oid("fileref", p) for p in ALL_FILES}
BUILD_FILES = {p: oid("buildfile", p) for p in SOURCES + RESOURCES}


def file_type(path: str) -> str:
    if path.endswith(".swift"):
        return "sourcecode.swift"
    if path.endswith(".xcassets"):
        return "folder.assetcatalog"
    if path.endswith(".plist"):
        return "text.plist.xml"
    if path.endswith(".xcprivacy"):
        return "text.plist.xml"
    return "text"


# ---------------------------------------------------------------- 束ね

def group_tree() -> dict:
    tree: dict = {}
    for path in ALL_FILES:
        node = tree
        parts = path.split("/")
        for part in parts[:-1]:
            node = node.setdefault(part, {})
        node[parts[-1]] = path
    return tree


def emit_groups(tree: dict, name: str, out: list[str], is_root: bool = False) -> str:
    """束の入れ子を書き出す。

    根の束にだけ path を付けない。付けると道が一段深くなり、
    Kyusei/ios/... を探しにいって「入力のファイルが見つからない」となる。
    """
    gid = oid("group", name, *sorted(tree.keys()))
    children = []
    for key in sorted(tree.keys()):
        value = tree[key]
        if isinstance(value, dict):
            children.append((emit_groups(value, f"{name}/{key}", out), key))
        else:
            children.append((FILE_REFS[value], key))
    lines = "\n".join(f"\t\t\t\t{cid} /* {label} */," for cid, label in children)
    label = name.split("/")[-1]
    locator = f'name = "{label}";' if is_root else f'path = "{label}";'
    out.append(
        f"\t\t{gid} /* {label} */ = {{\n"
        f"\t\t\tisa = PBXGroup;\n"
        f"\t\t\tchildren = (\n{lines}\n\t\t\t);\n"
        f"\t\t\t{locator}\n"
        f"\t\t\tsourceTree = \"<group>\";\n"
        f"\t\t}};"
    )
    return gid


def phase_files(paths: list[str]) -> str:
    return "\n".join(
        f"\t\t\t\t{BUILD_FILES[p]} /* {Path(p).name} in Phase */," for p in paths
    )


def base_settings() -> list[str]:
    return [
        "ALWAYS_SEARCH_USER_PATHS = NO;",
        "CLANG_ENABLE_MODULES = YES;",
        "CLANG_ENABLE_OBJC_ARC = YES;",
        "ENABLE_STRICT_OBJC_MSGSEND = YES;",
        "GCC_C_LANGUAGE_STANDARD = gnu17;",
        f"IPHONEOS_DEPLOYMENT_TARGET = {IOS_DEPLOYMENT_TARGET};",
        "SDKROOT = iphoneos;",
        "SWIFT_EMIT_LOC_STRINGS = YES;",
        f"SWIFT_VERSION = {SWIFT_VERSION};",
        'TARGETED_DEVICE_FAMILY = "1,2";',
    ]


def target_settings(config: str) -> str:
    lines = base_settings() + [
        "ASSETCATALOG_COMPILER_APPICON_NAME = AppIcon;",
        "CODE_SIGN_STYLE = Automatic;",
        f"DEVELOPMENT_TEAM = {DEVELOPMENT_TEAM};",
        "CURRENT_PROJECT_VERSION = 1;",
        "MARKETING_VERSION = 1.0;",
        "ENABLE_PREVIEWS = YES;",
        # YES にすると、手書きの plist に CFBundleIdentifier などを足してくれる。
        # NO だと足りないまま束が出来て、端末に入らない。
        "GENERATE_INFOPLIST_FILE = YES;",
        f'INFOPLIST_FILE = "{PLIST}";',
        f'INFOPLIST_KEY_CFBundleDisplayName = "{DISPLAY_NAME}";',
        'LD_RUNPATH_SEARCH_PATHS = ("$(inherited)", "@executable_path/Frameworks");',
        f'PRODUCT_BUNDLE_IDENTIFIER = "{BUNDLE_ID}";',
        f'PRODUCT_NAME = "$(TARGET_NAME)";',
        "SWIFT_EMIT_LOC_STRINGS = YES;",
    ]
    if config == "Debug":
        lines += [
            "DEBUG_INFORMATION_FORMAT = dwarf",
            "GCC_OPTIMIZATION_LEVEL = 0;",
            "ONLY_ACTIVE_ARCH = YES;",
            "SWIFT_OPTIMIZATION_LEVEL = \"-Onone\";",
            'SWIFT_ACTIVE_COMPILATION_CONDITIONS = "DEBUG $(inherited)";',
        ]
        lines = [x if x.endswith(";") else x + ";" for x in lines]
    else:
        lines += [
            'DEBUG_INFORMATION_FORMAT = "dwarf-with-dsym";',
            "SWIFT_OPTIMIZATION_LEVEL = \"-O\";",
            "SWIFT_COMPILATION_MODE = wholemodule;",
            "VALIDATE_PRODUCT = YES;",
        ]
    return "\n".join(f"\t\t\t\t{x}" for x in lines)


def project_settings(config: str) -> str:
    lines = base_settings()
    if config == "Debug":
        lines += ["ONLY_ACTIVE_ARCH = YES;", 'GCC_PREPROCESSOR_DEFINITIONS = ("DEBUG=1", "$(inherited)");']
    else:
        lines += ["VALIDATE_PRODUCT = YES;"]
    return "\n".join(f"\t\t\t\t{x}" for x in lines)


def generate() -> str:
    groups: list[str] = []
    root_gid = emit_groups(group_tree(), PROJECT_NAME, groups, is_root=True)

    refs = "\n".join(
        f'\t\t{FILE_REFS[p]} /* {Path(p).name} */ = {{isa = PBXFileReference; '
        f'lastKnownFileType = {file_type(p)}; path = "{Path(p).name}"; sourceTree = "<group>"; }};'
        for p in ALL_FILES
    )
    build = "\n".join(
        f'\t\t{BUILD_FILES[p]} /* {Path(p).name} in Phase */ = {{isa = PBXBuildFile; '
        f'fileRef = {FILE_REFS[p]} /* {Path(p).name} */; }};'
        for p in SOURCES + RESOURCES
    )

    # 本の中身は埋め込まない。埋め込むと行継続の \\ が pbxproj の逃げ字と
    # ぶつかって壊れる（rsync の -a \\ が literal な n になった）。呼ぶだけにする。
    copy_web = f'\\"$SRCROOT/{COPY_WEB_SCRIPT}\\"'

    return f"""// !$*UTF8*$!
{{
\tarchiveVersion = 1;
\tclasses = {{
\t}};
\tobjectVersion = 56;
\tobjects = {{

/* Begin PBXBuildFile section */
{build}
/* End PBXBuildFile section */

/* Begin PBXFileReference section */
{refs}
\t\t{PRODUCT_ID} /* {PROJECT_NAME}.app */ = {{isa = PBXFileReference; explicitFileType = wrapper.application; includeInIndex = 0; path = {PROJECT_NAME}.app; sourceTree = BUILT_PRODUCTS_DIR; }};
/* End PBXFileReference section */

/* Begin PBXFrameworksBuildPhase section */
\t\t{FRAMEWORKS_PHASE} /* Frameworks */ = {{
\t\t\tisa = PBXFrameworksBuildPhase;
\t\t\tbuildActionMask = 2147483647;
\t\t\tfiles = (
\t\t\t);
\t\t\trunOnlyForDeploymentPostprocessing = 0;
\t\t}};
/* End PBXFrameworksBuildPhase section */

/* Begin PBXGroup section */
\t\t{MAIN_GROUP} = {{
\t\t\tisa = PBXGroup;
\t\t\tchildren = (
\t\t\t\t{root_gid} /* {PROJECT_NAME} */,
\t\t\t\t{PRODUCTS_GROUP} /* Products */,
\t\t\t);
\t\t\tsourceTree = "<group>";
\t\t}};
\t\t{PRODUCTS_GROUP} /* Products */ = {{
\t\t\tisa = PBXGroup;
\t\t\tchildren = (
\t\t\t\t{PRODUCT_ID} /* {PROJECT_NAME}.app */,
\t\t\t);
\t\t\tname = Products;
\t\t\tsourceTree = "<group>";
\t\t}};
{chr(10).join(groups)}
/* End PBXGroup section */

/* Begin PBXNativeTarget section */
\t\t{TARGET_ID} /* {PROJECT_NAME} */ = {{
\t\t\tisa = PBXNativeTarget;
\t\t\tbuildConfigurationList = {TARGET_CONFIGS};
\t\t\tbuildPhases = (
\t\t\t\t{SOURCES_PHASE} /* Sources */,
\t\t\t\t{FRAMEWORKS_PHASE} /* Frameworks */,
\t\t\t\t{RESOURCES_PHASE} /* Resources */,
\t\t\t\t{WEB_PHASE} /* 鑑定アプリを写す */,
\t\t\t);
\t\t\tbuildRules = (
\t\t\t);
\t\t\tdependencies = (
\t\t\t);
\t\t\tname = {PROJECT_NAME};
\t\t\tproductName = {PROJECT_NAME};
\t\t\tproductReference = {PRODUCT_ID} /* {PROJECT_NAME}.app */;
\t\t\tproductType = "com.apple.product-type.application";
\t\t}};
/* End PBXNativeTarget section */

/* Begin PBXProject section */
\t\t{PROJECT_ID} /* Project object */ = {{
\t\t\tisa = PBXProject;
\t\t\tattributes = {{
\t\t\t\tBuildIndependentTargetsInParallel = 1;
\t\t\t\tLastSwiftUpdateCheck = 1600;
\t\t\t\tLastUpgradeCheck = 1600;
\t\t\t\tTargetAttributes = {{
\t\t\t\t\t{TARGET_ID} = {{
\t\t\t\t\t\tCreatedOnToolsVersion = 16.0;
\t\t\t\t\t}};
\t\t\t\t}};
\t\t\t}};
\t\t\tbuildConfigurationList = {PROJECT_CONFIGS};
\t\t\tcompatibilityVersion = "Xcode 14.0";
\t\t\tdevelopmentRegion = ja;
\t\t\thasScannedForEncodings = 0;
\t\t\tknownRegions = (
\t\t\t\tja,
\t\t\t\tBase,
\t\t\t);
\t\t\tmainGroup = {MAIN_GROUP};
\t\t\tproductRefGroup = {PRODUCTS_GROUP} /* Products */;
\t\t\tprojectDirPath = "";
\t\t\tprojectRoot = "";
\t\t\ttargets = (
\t\t\t\t{TARGET_ID} /* {PROJECT_NAME} */,
\t\t\t);
\t\t}};
/* End PBXProject section */

/* Begin PBXResourcesBuildPhase section */
\t\t{RESOURCES_PHASE} /* Resources */ = {{
\t\t\tisa = PBXResourcesBuildPhase;
\t\t\tbuildActionMask = 2147483647;
\t\t\tfiles = (
{phase_files(RESOURCES)}
\t\t\t);
\t\t\trunOnlyForDeploymentPostprocessing = 0;
\t\t}};
/* End PBXResourcesBuildPhase section */

/* Begin PBXShellScriptBuildPhase section */
\t\t{WEB_PHASE} /* 鑑定アプリを写す */ = {{
\t\t\tisa = PBXShellScriptBuildPhase;
\t\t\talwaysOutOfDate = 1;
\t\t\tbuildActionMask = 2147483647;
\t\t\tfiles = (
\t\t\t);
\t\t\tinputPaths = (
\t\t\t);
\t\t\tname = "鑑定アプリを写す";
\t\t\toutputPaths = (
\t\t\t);
\t\t\trunOnlyForDeploymentPostprocessing = 0;
\t\t\tshellPath = /bin/bash;
\t\t\tshellScript = "{copy_web}";
\t\t}};
/* End PBXShellScriptBuildPhase section */

/* Begin PBXSourcesBuildPhase section */
\t\t{SOURCES_PHASE} /* Sources */ = {{
\t\t\tisa = PBXSourcesBuildPhase;
\t\t\tbuildActionMask = 2147483647;
\t\t\tfiles = (
{phase_files(SOURCES)}
\t\t\t);
\t\t\trunOnlyForDeploymentPostprocessing = 0;
\t\t}};
/* End PBXSourcesBuildPhase section */

/* Begin XCBuildConfiguration section */
\t\t{P_DEBUG} /* Debug */ = {{
\t\t\tisa = XCBuildConfiguration;
\t\t\tbuildSettings = {{
{project_settings("Debug")}
\t\t\t}};
\t\t\tname = Debug;
\t\t}};
\t\t{P_RELEASE} /* Release */ = {{
\t\t\tisa = XCBuildConfiguration;
\t\t\tbuildSettings = {{
{project_settings("Release")}
\t\t\t}};
\t\t\tname = Release;
\t\t}};
\t\t{T_DEBUG} /* Debug */ = {{
\t\t\tisa = XCBuildConfiguration;
\t\t\tbuildSettings = {{
{target_settings("Debug")}
\t\t\t}};
\t\t\tname = Debug;
\t\t}};
\t\t{T_RELEASE} /* Release */ = {{
\t\t\tisa = XCBuildConfiguration;
\t\t\tbuildSettings = {{
{target_settings("Release")}
\t\t\t}};
\t\t\tname = Release;
\t\t}};
/* End XCBuildConfiguration section */

/* Begin XCConfigurationList section */
\t\t{PROJECT_CONFIGS} = {{
\t\t\tisa = XCConfigurationList;
\t\t\tbuildConfigurations = (
\t\t\t\t{P_DEBUG} /* Debug */,
\t\t\t\t{P_RELEASE} /* Release */,
\t\t\t);
\t\t\tdefaultConfigurationIsVisible = 0;
\t\t\tdefaultConfigurationName = Release;
\t\t}};
\t\t{TARGET_CONFIGS} = {{
\t\t\tisa = XCConfigurationList;
\t\t\tbuildConfigurations = (
\t\t\t\t{T_DEBUG} /* Debug */,
\t\t\t\t{T_RELEASE} /* Release */,
\t\t\t);
\t\t\tdefaultConfigurationIsVisible = 0;
\t\t\tdefaultConfigurationName = Release;
\t\t}};
/* End XCConfigurationList section */
\t}};
\trootObject = {PROJECT_ID} /* Project object */;
}}
"""


SCHEME = f"""<?xml version="1.0" encoding="UTF-8"?>
<Scheme LastUpgradeVersion = "1600" version = "1.7">
   <BuildAction parallelizeBuildables = "YES" buildImplicitDependencies = "YES">
      <BuildActionEntries>
         <BuildActionEntry buildForTesting = "YES" buildForRunning = "YES" buildForProfiling = "YES" buildForArchiving = "YES" buildForAnalyzing = "YES">
            <BuildableReference
               BuildableIdentifier = "primary"
               BlueprintIdentifier = "{TARGET_ID}"
               BuildableName = "{PROJECT_NAME}.app"
               BlueprintName = "{PROJECT_NAME}"
               ReferencedContainer = "container:{PROJECT_NAME}.xcodeproj">
            </BuildableReference>
         </BuildActionEntry>
      </BuildActionEntries>
   </BuildAction>
   <LaunchAction buildConfiguration = "Debug" selectedDebuggerIdentifier = "Xcode.DebuggerFoundation.Debugger.LLDB" selectedLauncherIdentifier = "Xcode.DebuggerFoundation.Launcher.LLDB" launchStyle = "0" useCustomWorkingDirectory = "NO" ignoresPersistentStateOnLaunch = "NO" debugDocumentVersioning = "YES" debugServiceExtension = "internal" allowLocationSimulation = "YES">
      <BuildableProductRunnable runnableDebuggingMode = "0">
         <BuildableReference
            BuildableIdentifier = "primary"
            BlueprintIdentifier = "{TARGET_ID}"
            BuildableName = "{PROJECT_NAME}.app"
            BlueprintName = "{PROJECT_NAME}"
            ReferencedContainer = "container:{PROJECT_NAME}.xcodeproj">
         </BuildableReference>
      </BuildableProductRunnable>
   </LaunchAction>
   <ProfileAction buildConfiguration = "Release" shouldUseLaunchSchemeArgsEnv = "YES" savedToolIdentifier = "" useCustomWorkingDirectory = "NO" debugDocumentVersioning = "YES">
      <BuildableProductRunnable runnableDebuggingMode = "0">
         <BuildableReference
            BuildableIdentifier = "primary"
            BlueprintIdentifier = "{TARGET_ID}"
            BuildableName = "{PROJECT_NAME}.app"
            BlueprintName = "{PROJECT_NAME}"
            ReferencedContainer = "container:{PROJECT_NAME}.xcodeproj">
         </BuildableReference>
      </BuildableProductRunnable>
   </ProfileAction>
   <AnalyzeAction buildConfiguration = "Debug"></AnalyzeAction>
   <ArchiveAction buildConfiguration = "Release" revealArchiveInOrganizer = "YES"></ArchiveAction>
</Scheme>
"""


def main() -> None:
    proj = ROOT / f"{PROJECT_NAME}.xcodeproj"
    (proj / "xcshareddata" / "xcschemes").mkdir(parents=True, exist_ok=True)
    (proj / "project.pbxproj").write_text(generate(), encoding="utf-8")
    (proj / "xcshareddata" / "xcschemes" / f"{PROJECT_NAME}.xcscheme").write_text(
        SCHEME, encoding="utf-8"
    )
    print(f"書き出しました: {proj}")
    print(f"  {PROJECT_NAME}  {BUNDLE_ID}  「{DISPLAY_NAME}」")


if __name__ == "__main__":
    main()
