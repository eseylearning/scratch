import bindAll from "lodash.bindall";
import PropTypes from "prop-types";
import React from "react";
import { connect } from "react-redux";
import { projectTitleInitialState } from "../reducers/project-title";
import downloadBlob from "../lib/download-blob";
import { appdownload } from "../lib/appUtils";
/**
 * Project saver component passes a downloadProject function to its child.
 * It expects this child to be a function with the signature
 *     function (downloadProject, props) {}
 * The component can then be used to attach project saving functionality
 * to any other component:
 *
 * <SB3Downloader>{(downloadProject, props) => (
 *     <MyCoolComponent
 *         onClick={downloadProject}
 *         {...props}
 *     />
 * )}</SB3Downloader>
 */
class SB3Downloader extends React.Component {
    constructor(props) {
        super(props);
        bindAll(this, ["downloadProject"]);
    }
    downloadProject() {
        this.props.saveProjectSb3().then((content) => {
            if (this.props.onSaveFinished) {
                this.props.onSaveFinished();
            }
            if (getQueryParam("app") === "1") {
                // 将文件流转换为base64格式
                const reader = new FileReader();
                reader.onload = function () {
                    const base64String = reader.result.split(",")[1]; // 移除data:xxx;base64,前缀
                    appdownload({
                        filename: this.props.projectFilename,
                        content: base64String,
                    });
                }.bind(this);
                reader.readAsDataURL(content);
            } else {
                downloadBlob(this.props.projectFilename, content);
            }
        });
    }
    render() {
        const { children } = this.props;
        return children(this.props.className, this.downloadProject);
    }
}
const getQueryParam = (paramName) => {
    // 获取当前 URL
    const url = window.location.href;

    // 创建 URL 对象
    const urlParams = new URL(url);

    // 使用 URLSearchParams 获取查询参数
    const searchParams = urlParams.searchParams;

    // 返回指定参数的值
    return searchParams.get(paramName);
};
const getProjectFilename = (curTitle, defaultTitle) => {
    let filenameTitle = curTitle;
    if (!filenameTitle || filenameTitle.length === 0) {
        filenameTitle = defaultTitle;
    }
    return `${filenameTitle.substring(0, 100)}.sb3`;
};

SB3Downloader.propTypes = {
    children: PropTypes.func,
    className: PropTypes.string,
    onSaveFinished: PropTypes.func,
    projectFilename: PropTypes.string,
    saveProjectSb3: PropTypes.func,
};
SB3Downloader.defaultProps = {
    className: "",
};

const mapStateToProps = (state) => ({
    saveProjectSb3: state.scratchGui.vm.saveProjectSb3.bind(
        state.scratchGui.vm
    ),
    projectFilename: getProjectFilename(
        state.scratchGui.projectTitle,
        projectTitleInitialState
    ),
});

export default connect(
    mapStateToProps,
    () => ({}) // omit dispatch prop
)(SB3Downloader);
